import { Types } from 'mongoose';
import dbConnect from './db';
import Professor, { IProfessor } from '@/models/professor';
import Room, { IRoom } from '@/models/room';
import Schedule, { ISchedule } from '@/models/schedule';
import ProfessorDuty from '@/models/professorDuty';

interface AllocationResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
}

// Define maximum duties per designation
const MAX_DUTIES = {
  'Professor': 1,
  'Associate Professor': 2,
  'Assistant Professor': 4
};

/**
 * Role-based professor allocation algorithm
 * - Strictly enforces designation-based duty limits (Professor: 1, Associate: 2, Assistant: 4)
 * - Sorts professors by designation seniority (Professor > Associate > Assistant)
 * - Tracks duties assigned to each professor to prevent exceeding limits
 * - Avoids assigning the same professor multiple times in a day
 * - Allocates duties fairly across eligible professors
 */
export async function allocateProfessors(): Promise<AllocationResult> {
  try {
    await dbConnect();
    console.log('Starting professor allocation process...');
    
    // Get all active professors sorted by designation priority and current duty count
    const professors = await Professor.find().sort({ 
      designation: -1, // Higher value for more senior designations
      dutyCount: 1     // Those with fewer duties get priority
    }).lean();
    
    console.log(`Found ${professors.length} professors`);
    
    if (professors.length === 0) {
      return { success: false, error: 'No professors available for allocation' };
    }
    
    // Get all active rooms
    const rooms = await Room.find({ isActive: true }).lean();
    console.log(`Found ${rooms.length} active rooms`);
    
    if (rooms.length === 0) {
      return { success: false, error: 'No active rooms available for allocation' };
    }
    
    // Get all schedules (exam dates & shifts)
    const schedules = await Schedule.find({ isActive: true }).sort({ date: 1, shift: 1 }).lean();
    console.log(`Found ${schedules.length} active schedules`);
    
    if (schedules.length === 0) {
      return { success: false, error: 'No exam schedules found for allocation' };
    }
    
    // Clear existing duties before allocation
    await ProfessorDuty.deleteMany({});
    console.log('Cleared existing professor duties');
    
    // Reset all professor duty counts to zero
    await Professor.updateMany({}, { dutyCount: 0 });
    console.log('Reset all professor duty counts to zero');
    
    // Verify that the model does not require schedule field
    try {
      // Test the model with a sample duty without schedule
      const testDuty = new ProfessorDuty({
        professor: professors[0]._id,
        room: rooms[0]._id,
        date: new Date(),
        shift: 'Morning',
        startTime: '09:00',
        endTime: '12:00'
      });
      
      // Validate the model
      await testDuty.validate();
      console.log('Model validation successful - proceeding with allocation');
      
      // Remove test duty
      await ProfessorDuty.deleteOne({ _id: testDuty._id });
    } catch (validationError) {
      console.error('Model validation failed:', validationError);
      return { 
        success: false, 
        error: 'The ProfessorDuty model is not configured correctly. Please check your schema.'
      };
    }
    
    // Start allocation
    const allocations = [];
    const warnings: string[] = [];
    
    // Create a map to track professors already assigned on each date
    const assignedProfessorsPerDay = new Map();
    
    // Track duty count for each professor during the allocation process
    const professorDutyCounts = new Map();
    professors.forEach(prof => {
      professorDutyCounts.set(prof._id.toString(), 0);
    });
    
    // Group schedules by date for assignment tracking
    interface SchedulesByDate {
      [dateStr: string]: ISchedule[];
    }
    
    const schedulesByDate = schedules.reduce<SchedulesByDate>((acc, schedule) => {
      const dateStr = new Date(schedule.date).toDateString();
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(schedule);
      return acc;
    }, {});
    
    // Calculate required duties
    const totalRequiredDuties = schedules.length * rooms.length;
    console.log(`Total required duties: ${totalRequiredDuties}`);
    
    // Calculate available duty capacity based on professor limits
    let availableDutyCapacity = professors.reduce((sum, prof) => {
      const maxDuties = MAX_DUTIES[prof.designation as keyof typeof MAX_DUTIES] || 1;
      return sum + maxDuties;
    }, 0);
    console.log(`Available duty capacity: ${availableDutyCapacity}`);
    
    if (availableDutyCapacity < totalRequiredDuties) {
      warnings.push(`Warning: Not enough capacity with current professors. Need ${totalRequiredDuties} duties but only have capacity for ${availableDutyCapacity}.`);
      console.warn(`Warning: Not enough capacity with current professors. Need ${totalRequiredDuties} duties but only have capacity for ${availableDutyCapacity}.`);
    }
    
    // Add shuffle helper
    function shuffleArray(array: any[]) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
    
    // Shuffle schedules for random allocation order
    const shuffledSchedules = shuffleArray([...schedules]);
    
    // Process each schedule (date and shift)
    for (const schedule of shuffledSchedules) {
      console.log(`Allocating for schedule: ${schedule.date} - ${schedule.shift}`);
      const dateStr = new Date(schedule.date).toDateString();
      
      // Initialize tracking for this date if not exists
      if (!assignedProfessorsPerDay.has(dateStr)) {
        assignedProfessorsPerDay.set(dateStr, new Set());
      }
      
      // Get set of professors already assigned on this date
      const assignedToday = assignedProfessorsPerDay.get(dateStr);
      
      // Shuffle rooms for this schedule
      const shuffledRooms = shuffleArray([...rooms]);
      
      // Allocate one professor per room for this schedule
      for (const room of shuffledRooms) {
        // Find eligible professors for this duty assignment
        const eligibleProfessors = professors.filter(professor => {
          const profId = professor._id.toString();
          
          // Check if already assigned on this date
          if (assignedToday.has(profId)) {
            return false;
          }
          
          // Check current duty count against maximum allowed for designation
          const currentDutyCount = professorDutyCounts.get(profId) || 0;
          const maxDuties = MAX_DUTIES[professor.designation as keyof typeof MAX_DUTIES] || 1;
          
          // STRICT ENFORCEMENT: Only include professors who haven't reached their limit
          return currentDutyCount < maxDuties;
        });
        
        // If no eligible professors available, record a warning
        if (eligibleProfessors.length === 0) {
          console.warn(`No eligible professors for room ${room.number} on ${dateStr} - ${schedule.shift} within duty limits`);
          warnings.push(`Could not allocate a professor for room ${room.number} on ${dateStr} - ${schedule.shift}. All professors have reached their duty limits.`);
          continue; // Skip this room - do not override the limits
        }
        
        // Sort by duty count
        eligibleProfessors.sort((a, b) => {
          const countA = professorDutyCounts.get(a._id.toString()) || 0;
          const countB = professorDutyCounts.get(b._id.toString()) || 0;
          return countA - countB;
        });
        
        // Find all with the minimum duty count
        const minDuty = professorDutyCounts.get(eligibleProfessors[0]._id.toString()) || 0;
        const minDutyProfs = eligibleProfessors.filter(
          prof => (professorDutyCounts.get(prof._id.toString()) || 0) === minDuty
        );
        
        // Pick one at random
        const selectedProfessor = minDutyProfs[Math.floor(Math.random() * minDutyProfs.length)];
        
        // Double-check limits before creating allocation
        const currentCount = professorDutyCounts.get(selectedProfessor._id.toString()) || 0;
        const maxAllowed = MAX_DUTIES[selectedProfessor.designation as keyof typeof MAX_DUTIES] || 1;
        
        if (currentCount >= maxAllowed) {
          // This should never happen due to our filtering above, but added as a safeguard
          warnings.push(`Skipped assignment for ${selectedProfessor.name} (${selectedProfessor.designation}) due to duty limit (${currentCount}/${maxAllowed})`);
          continue;
        }
        
        // Create the duty allocation
        const duty = {
          professor: selectedProfessor._id,
          room: room._id,
          date: schedule.date,
          shift: schedule.shift,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        };
        
        allocations.push(duty);
        
        // Update tracking: mark professor as assigned for today and increment duty count
        assignedToday.add(selectedProfessor._id.toString());
        professorDutyCounts.set(
          selectedProfessor._id.toString(),
          currentCount + 1
        );
        
        // Log assignment with duty count
        console.log(`Assigned ${selectedProfessor.name} (${selectedProfessor.designation}) to room ${room.number}: Duty ${currentCount + 1}/${maxAllowed}`);
      }
    }
    
    console.log(`Created ${allocations.length} duty allocations`);
    
    // Generate duty allocation summary
    const dutyCountByProfessor = new Map();
    for (const [profId, count] of professorDutyCounts.entries()) {
      if (count > 0) {
        dutyCountByProfessor.set(profId, count);
      }
    }
    
    console.log(`Professors with duties: ${dutyCountByProfessor.size}`);
    
    // Verify no professor exceeds their duty limit
    let limitsRespected = true;
    for (const prof of professors) {
      const dutyCount = professorDutyCounts.get(prof._id.toString()) || 0;
      const maxAllowed = MAX_DUTIES[prof.designation as keyof typeof MAX_DUTIES] || 1;
      
      if (dutyCount > maxAllowed) {
        limitsRespected = false;
        warnings.push(`Professor ${prof.name} (${prof.designation}) has ${dutyCount} duties, exceeding limit of ${maxAllowed}`);
      }
    }
    
    if (!limitsRespected) {
      console.warn('Some professors have exceeded their duty limits despite safeguards');
    } else {
      console.log('All professor duty limits have been respected');
    }
    
    // Save all allocations to database
    if (allocations.length > 0) {
      console.log('Saving allocations to database...');
      try {
        const result = await ProfessorDuty.insertMany(allocations, { ordered: false });
        console.log(`Successfully saved ${result.length} allocations`);
      
        // Update professor duty counts in database
        const updatePromises = [];
        for (const [profId, count] of professorDutyCounts.entries()) {
          updatePromises.push(
            Professor.findByIdAndUpdate(profId, { dutyCount: count })
          );
        }
        
        await Promise.all(updatePromises);
        console.log('Updated professor duty counts in database');
      } catch (insertError) {
        console.error('Error inserting duties:', insertError);
        return { 
          success: false, 
          error: insertError instanceof Error ? insertError.message : 'Error saving duties',
          warnings
        };
      }
    }
    
    return { 
      success: true, 
      data: { 
        totalAllocations: allocations.length,
        schedules: schedules.length,
        rooms: rooms.length, 
        professors: professors.length,
        limitsRespected
      },
      warnings: warnings.length > 0 ? warnings : undefined
    };
    
  } catch (error) {
    console.error('Professor allocation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during professor allocation' 
    };
  }
} 