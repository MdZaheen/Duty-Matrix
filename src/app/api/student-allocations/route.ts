import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import StudentAllocation from '@/models/studentAllocation';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const scheduleId = searchParams.get('scheduleId');
    const subjectId = searchParams.get('subjectId');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Fetch student allocations with populated references
    const query: Record<string, string> = { schedule: scheduleId };
    if (subjectId) {
      // If subjectId is provided, filter by subject as well
      query['subject'] = subjectId;
    }
    const allocations = await StudentAllocation.find(query)
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