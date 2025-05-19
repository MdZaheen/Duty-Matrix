import { Types } from 'mongoose';
import dbConnect from './db';
import Student, { IStudent } from '@/models/student';
import Room, { IRoom } from '@/models/room';
import Schedule, { ISchedule } from '@/models/schedule';
import Subject, { ISubject } from '@/models/subject';
import StudentAllocation from '@/models/studentAllocation';

interface AllocationResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Helper function to shuffle an array (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Section-wise student allocation algorithm
 * - Groups students by section
 * - Allocates full sections to rooms when possible
 * - Splits sections across rooms when needed
 * - Sorts students by USN for easy seating
 * - Randomizes room assignments
 */
export async function allocateStudents(
  scheduleId: string, 
  subjectId: string
): Promise<AllocationResult> {
  try {
    await dbConnect();
    
    // Get schedule details
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return { success: false, error: 'Exam schedule not found' };
    }
    
    // Get subject details
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return { success: false, error: 'Subject not found' };
    }
    
    // Get all active rooms and sort by capacity (largest first)
    const allRooms = await Room.find({ isActive: true }).sort({ capacity: -1 }).lean();
    if (allRooms.length === 0) {
      return { success: false, error: 'No active rooms available for allocation' };
    }
    
    // Randomize room order while maintaining capacity sorting in groups
    // Group rooms by similar capacity for more fair distribution
    const roomGroups: { [capacity: number]: typeof allRooms } = {};
    allRooms.forEach(room => {
      if (!roomGroups[room.capacity]) {
        roomGroups[room.capacity] = [];
      }
      roomGroups[room.capacity].push(room);
    });
    
    // Shuffle each capacity group independently
    Object.keys(roomGroups).forEach(capacity => {
      roomGroups[Number(capacity)] = shuffleArray(roomGroups[Number(capacity)]);
    });
    
    // Reconstruct the rooms array with capacity groups in descending order but rooms within each group randomized
    const capacities = Object.keys(roomGroups).map(Number).sort((a, b) => b - a);
    let rooms: typeof allRooms = [];
    capacities.forEach(capacity => {
      rooms = [...rooms, ...roomGroups[capacity]];
    });
    
    console.log(`Randomized room order for allocation. Using ${rooms.length} rooms.`);
    
    // Calculate total capacity of all rooms
    const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
    
    // Get all students for the specified subject (matching semester and branch)
    const students = await Student.find({
      semester: subject.semester,
      branch: subject.branch
    }).sort({ section: 1, usn: 1 }).lean();
    
    if (students.length === 0) {
      return { success: false, error: 'No students found for the specified subject' };
    }
    
    // Verify if we have enough capacity for all students
    if (students.length > totalCapacity) {
      return { 
        success: false, 
        error: `Not enough room capacity for all students. Need ${students.length} seats, have ${totalCapacity}.` 
      };
    }
    
    // Group students by section
    interface SectionMap {
      [section: string]: any[];
    }
    
    const sections: SectionMap = {};
    students.forEach(student => {
      if (!sections[student.section]) {
        sections[student.section] = [];
      }
      sections[student.section].push(student);
    });
    
    console.log(`Found ${Object.keys(sections).length} sections with ${students.length} total students`);
    
    // Start allocation
    const allocations = [];
    let currentRoomIndex = 0;
    let currentSeatNumber = 1;
    let currentRoom = rooms[currentRoomIndex];
    
    // Sort sections alphabetically to ensure consistent order
    const sortedSections = Object.keys(sections).sort();
    
    // Process each section
    for (const section of sortedSections) {
      const sectionStudents = sections[section];
      console.log(`Allocating section ${section} with ${sectionStudents.length} students to room ${currentRoom.number}`);
      
      // Sort students by USN within each section
      sectionStudents.sort((a: any, b: any) => a.usn.localeCompare(b.usn));
      
      // Try to allocate the entire section to the same room if possible
      if (currentSeatNumber + sectionStudents.length - 1 <= currentRoom.capacity) {
        // Entire section fits in current room
        for (const student of sectionStudents) {
          // Create student allocation
          allocations.push({
            student: student._id,
            room: currentRoom._id,
            schedule: schedule._id,
            subject: subject._id,
            seatNumber: currentSeatNumber,
            attendance: false,
            ciaMarks: {
              cia1: null,
              cia2: null,
              cia3: null
            }
          });
          
          currentSeatNumber++;
        }
      } else {
        // Section needs to be split across rooms
        for (const student of sectionStudents) {
          // Check if we need to move to the next room
          if (currentSeatNumber > currentRoom.capacity) {
            currentRoomIndex++;
            
            // Check if we've run out of rooms
            if (currentRoomIndex >= rooms.length) {
              return { 
                success: false, 
                error: 'Not enough room capacity for all students',
                data: { 
                  allocatedStudents: allocations.length,
                  remainingStudents: students.length - allocations.length
                }
              };
            }
            
            // Move to next room and reset seat number
            currentRoom = rooms[currentRoomIndex];
            currentSeatNumber = 1;
            
            console.log(`Section ${section} split into a new room: ${currentRoom.number}`);
          }
          
          // Create student allocation
          allocations.push({
            student: student._id,
            room: currentRoom._id,
            schedule: schedule._id,
            subject: subject._id,
            seatNumber: currentSeatNumber,
            attendance: false,
            ciaMarks: {
              cia1: null,
              cia2: null,
              cia3: null
            }
          });
          
          currentSeatNumber++;
        }
      }
    }
    
    console.log(`Created ${allocations.length} student allocations across ${currentRoomIndex + 1} rooms`);
    
    // Save all allocations to database
    if (allocations.length > 0) {
      // Get the list of rooms being used in this allocation
      const usedRoomIds = [...new Set(allocations.map(a => a.room.toString()))];
      
      // Get the list of student IDs being allocated
      const studentIds = allocations.map(a => a.student);
      
      // Delete any existing allocations for these students in this schedule and subject
      await StudentAllocation.deleteMany({
        schedule: schedule._id,
        subject: subject._id,
        student: { $in: studentIds }
      });
      
      // Insert new allocations
      await StudentAllocation.insertMany(allocations);
    }
    
    return { 
      success: true, 
      data: { 
        totalAllocations: allocations.length,
        sections: Object.keys(sections).length,
        roomsUsed: currentRoomIndex + 1,
        totalRooms: rooms.length,
        students: students.length
      } 
    };
    
  } catch (error) {
    console.error('Student allocation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during student allocation' 
    };
  }
} 