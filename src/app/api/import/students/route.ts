import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import dbConnect from '@/lib/db';
import Student from '@/models/student';

// Disable default body parsing to handle file upload manually
export const config = {
  api: {
    bodyParser: false,
  },
};

interface StudentData {
  name: string;
  usn: string;
  branch: string;
  section: string;
  semester: number;
  email?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    const data = await req.formData();
    const file = data.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Only Excel files (.xlsx, .xls) are supported' },
        { status: 400 }
      );
    }
    
    // Save file to temp directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // Extract only required fields from each row
    const studentsData: StudentData[] = [];
    const errors: string[] = [];
    
    jsonData.forEach((row: any, index) => {
      try {
        // Extract only required fields and normalize field names (case-insensitive)
        const normalizedRow: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase()] = row[key];
        });
        
        // Validate required data
        if (!normalizedRow.name && !normalizedRow['student name']) {
          errors.push(`Row ${index + 2}: Missing required field 'Name'`);
          return;
        }
        
        if (!normalizedRow.usn && !normalizedRow['student usn'] && !normalizedRow['usn/id']) {
          errors.push(`Row ${index + 2}: Missing required field 'USN'`);
          return;
        }
        
        if (!normalizedRow.branch && !normalizedRow.dept && !normalizedRow.department) {
          errors.push(`Row ${index + 2}: Missing required field 'Branch'`);
          return;
        }
        
        if (!normalizedRow.section && !normalizedRow.sec) {
          errors.push(`Row ${index + 2}: Missing required field 'Section'`);
          return;
        }
        
        // Convert semester to number
        let semester = normalizedRow.semester || normalizedRow.sem;
        if (semester) {
          // Handle both numeric and text formats (like "1st", "2nd")
          if (typeof semester === 'string') {
            semester = parseInt(semester.replace(/[^0-9]/g, ''));
          }
        } else {
          errors.push(`Row ${index + 2}: Missing required field 'Semester'`);
          return;
        }
        
        if (isNaN(semester) || semester < 1 || semester > 8) {
          errors.push(`Row ${index + 2}: Invalid semester value. Must be between 1-8`);
          return;
        }
        
        const student: StudentData = {
          name: normalizedRow.name || normalizedRow['student name'] || '',
          usn: (normalizedRow.usn || normalizedRow['student usn'] || normalizedRow['usn/id'] || '').toUpperCase(),
          branch: (normalizedRow.branch || normalizedRow.dept || normalizedRow.department || '').toUpperCase(),
          section: (normalizedRow.section || normalizedRow.sec || '').toUpperCase(),
          semester: semester,
          email: normalizedRow.email || normalizedRow['student email'] || normalizedRow['email id'] || '',
        };
        
        studentsData.push(student);
      } catch (err) {
        errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });
    
    // Batch import for better performance with large datasets
    if (studentsData.length > 0) {
      // Use insertMany with ordered:false to continue even if some documents fail
      const result = await Student.insertMany(studentsData, { ordered: false })
        .catch(error => {
          // Handle duplicate key errors (likely duplicate USNs) and continue
          if (error.code === 11000) {
            return error.insertedDocs || [];
          }
          throw error;
        });
      
      return NextResponse.json({
        success: true,
        imported: result.length,
        total: studentsData.length,
        errors: errors.length > 0 ? errors : undefined
      });
    }
    
    return NextResponse.json(
      { error: 'No valid data found in the uploaded file', errors },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error importing students:', error);
    return NextResponse.json(
      { error: 'Failed to import students data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 