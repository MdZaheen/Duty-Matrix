import { NextRequest, NextResponse } from 'next/server';
import { allocateStudents } from '@/lib/studentAllocator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scheduleId, subjectId } = body;
    
    if (!scheduleId || !subjectId) {
      return NextResponse.json(
        { error: 'Schedule ID and Subject ID are required' }, 
        { status: 400 }
      );
    }
    
    const result = await allocateStudents(scheduleId, subjectId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to allocate students' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Student allocation API error:', error);
    return NextResponse.json(
      { error: 'Failed to process student allocation' }, 
      { status: 500 }
    );
  }
} 