import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import StudentAllocation from '@/models/studentAllocation';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const scheduleId = searchParams.get('scheduleId');
    const subjectId = searchParams.get('subjectId');
    
    if (!scheduleId || !subjectId) {
      return NextResponse.json(
        { error: 'Schedule ID and Subject ID are required' }, 
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Fetch student allocations with populated references
    const allocations = await StudentAllocation.find({
      schedule: scheduleId,
      subject: subjectId
    })
    .populate('student')
    .populate('room')
    .populate('schedule')
    .populate('subject')
    .lean();
    
    return NextResponse.json(allocations);
  } catch (error) {
    console.error('Error fetching student allocations:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve student allocations' }, 
      { status: 500 }
    );
  }
} 