import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProfessorDuty from '@/models/professorDuty';
import Professor from '@/models/professor';
import Room from '@/models/room';

// GET - Fetch all professor duties
export async function GET(req: NextRequest) {
  try {
    console.log('GET /api/professor-duties: Connecting to database');
    await dbConnect();
    
    console.log('GET /api/professor-duties: Fetching professor duties');
    const duties = await ProfessorDuty.find()
      .populate({
        path: 'professor',
        select: 'name designation email department',
        model: 'Professor'
      })
      .populate({
        path: 'room',
        select: 'number name capacity',
        model: 'Room'
      })
      .lean();
    
    console.log(`GET /api/professor-duties: Found ${duties.length} duties`);
    
    // Print detailed debug information
    if (duties.length > 0) {
      const sampleDuty = duties[0];
      console.log('Sample duty:', JSON.stringify({
        _id: sampleDuty._id,
        professor: sampleDuty.professor,
        room: sampleDuty.room,
        date: sampleDuty.date,
        shift: sampleDuty.shift
      }, null, 2));
    } else {
      console.log('No duties found');
    }
    
    // If any professor or room is missing, try to fetch them by ID
    const updatedDuties = await Promise.all(duties.map(async (duty: any) => {
      try {
        // If professor is just an ID, populate it
        if (duty.professor && typeof duty.professor === 'string') {
          const professor = await Professor.findById(duty.professor).lean();
          if (professor) {
            duty.professor = professor;
          }
        }
        
        // If room is just an ID, populate it
        if (duty.room && typeof duty.room === 'string') {
          const room = await Room.findById(duty.room).lean();
          if (room) {
            duty.room = room;
          }
        }
        
        return duty;
      } catch (err) {
        console.error('Error populating duty:', err);
        return duty;
      }
    }));
    
    return NextResponse.json(updatedDuties);
  } catch (error: unknown) {
    console.error('Error fetching professor duties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch professor duties', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}

// POST - Assign professor to duty
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.professor || !body.room || !body.date || !body.shift) {
      return NextResponse.json(
        { error: 'Professor, room, date, and shift are required' }, 
        { status: 400 }
      );
    }
    
    // Create new professor duty
    const professorDuty = await ProfessorDuty.create(body);
    
    // Increment the professor's duty count
    await Professor.findByIdAndUpdate(
      body.professor,
      { $inc: { dutyCount: 1 } }
    );
    
    return NextResponse.json(professorDuty, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating professor duty:', error);
    
    // Handle duplicate assignment error
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { error: 'Professor already assigned to this duty' }, 
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create professor duty', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 