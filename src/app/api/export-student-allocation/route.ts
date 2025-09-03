import { NextRequest, NextResponse } from 'next/server';
import { exportStudentAllocation, exportStudentSeatingCIAFormat, exportStudentSeatingSummaryCIAFormat } from '@/lib/excelExport';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const scheduleId = searchParams.get('scheduleId');
    const subjectId = searchParams.get('subjectId');
    const format = searchParams.get('format'); // 'cia' for CIA format
    const semester = searchParams.get('semester'); // semester number for filtering
    const assessment = searchParams.get('assessment') || '2'; // CIA assessment number (default to 2)
    
    // Validate assessment parameter
    if (!['1', '2', '3'].includes(assessment)) {
      return NextResponse.json(
        { error: 'Invalid assessment number. Must be 1, 2, or 3.' }, 
        { status: 400 }
      );
    }
    
    let buffer;
    let filename;
    
    // Determine which export format to use
    if (format === 'cia') {
      // Use the detailed CIA format for student seating
      const semesterNum = semester ? parseInt(semester, 10) : undefined;
      buffer = await exportStudentSeatingCIAFormat(semesterNum, scheduleId, assessment);
      
      const semesterText = semesterNum ? `_semester_${semesterNum}` : '';
      filename = `student_seating_CIA-${assessment}${semesterText}.xlsx`;
    } else if (format === 'summary') {
      // Use the USN range summary format like in the image
      const semesterNum = semester ? parseInt(semester, 10) : undefined;
      buffer = await exportStudentSeatingSummaryCIAFormat(semesterNum, scheduleId, assessment);
      
      const semesterText = semesterNum ? `_semester_${semesterNum}` : '';
      filename = `student_seating_summary_CIA-${assessment}${semesterText}.xlsx`;
    } else {
      // Use the regular student allocation format (requires both IDs)
      if (!scheduleId || !subjectId) {
        return NextResponse.json(
          { error: 'Schedule ID and Subject ID are required for regular format' }, 
          { status: 400 }
        );
      }
      
      buffer = await exportStudentAllocation(scheduleId, subjectId);
      filename = "student_allocation.xlsx";
    }
    
    // Set appropriate headers for Excel file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
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
