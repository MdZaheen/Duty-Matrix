import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    
    if (!type || (type !== 'professors' && type !== 'students')) {
      return NextResponse.json(
        { error: 'Type parameter must be either "professors" or "students"' },
        { status: 400 }
      );
    }
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    let worksheet;
    
    if (type === 'professors') {
      // Create sample data for professors template
      const professorsData = [
        {
          Name: 'John Doe',
          Designation: 'Associate Professor',
          Department: 'Computer Science',
          Email: 'john.doe@example.com'
        },
        {
          Name: 'Jane Smith',
          Designation: 'Assistant Professor',
          Department: 'Information Science',
          Email: 'jane.smith@example.com'
        }
      ];
      
      worksheet = XLSX.utils.json_to_sheet(professorsData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Professors Template');
    } else {
      // Create sample data for students template
      const studentsData = [
        {
          Name: 'Student One',
          USN: '1SI19CS001',
          Branch: 'CSE',
          Section: 'A',
          Semester: 5,
          Email: 'student1@example.com'
        },
        {
          Name: 'Student Two',
          USN: '1SI19IS002',
          Branch: 'ISE',
          Section: 'B',
          Semester: 3,
          Email: 'student2@example.com'
        }
      ];
      
      worksheet = XLSX.utils.json_to_sheet(studentsData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Template');
    }
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="${type}_template.xlsx"`);
    
    return new NextResponse(excelBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
} 