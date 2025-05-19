import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Schedule from '@/models/schedule';

// GET - Fetch all schedules
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const schedules = await Schedule.find({ isActive: true })
      .sort({ date: 1, startTime: 1 })
      .lean();
    
    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' }, 
      { status: 500 }
    );
  }
}

// POST - Create new schedule
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.date || !body.shift || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: 'Date, shift, startTime, and endTime are required' }, 
        { status: 400 }
      );
    }
    
    // Create new schedule
    const schedule = await Schedule.create({
      ...body,
      isActive: body.isActive !== undefined ? body.isActive : true
    });
    
    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' }, 
      { status: 500 }
    );
  }
} 