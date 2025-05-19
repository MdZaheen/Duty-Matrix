import { NextRequest, NextResponse } from 'next/server';
import { exportStudentAllocation } from '@/lib/excelExport';

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
    
    const buffer = await exportStudentAllocation(scheduleId, subjectId);
    
    // Set appropriate headers for Excel file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="student_allocation.xlsx"`);
    
    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Student allocation export error:', error);
    return NextResponse.json(
      { error: 'Failed to export student allocation chart' }, 
      { status: 500 }
    );
  }
} 