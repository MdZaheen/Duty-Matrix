import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import dbConnect from '@/lib/db';
import Professor from '@/models/professor';

// Disable default body parsing to handle file upload manually
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ProfessorData {
  name: string;
  designation: string;
  department?: string;
  email: string;
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
    
    // Parse Excel file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // Extract only required fields from each row
    const professorsData: ProfessorData[] = [];
    const errors: string[] = [];
    const processedEmails = new Set<string>(); // Track emails in current import
    
    // Get existing professors' emails - use lowercase for case-insensitive comparison
    const existingProfessors = await Professor.find({}, 'email');
    const existingEmails = new Set(
      existingProfessors
        .map(p => p.email?.toLowerCase())
        .filter((email): email is string => typeof email === 'string')
    );
    
    console.log(`Found ${existingEmails.size} existing professors in database`);
    
    // Process each row
    for (let index = 0; index < jsonData.length; index++) {
      const row = jsonData[index] as Record<string, any>;
      try {
        // Extract only required fields and normalize field names (case-insensitive)
        const normalizedRow: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase()] = row[key];
        });
        
        // Validate required data
        if (!normalizedRow.name && !normalizedRow['professor name']) {
          errors.push(`Row ${index + 2}: Missing required field 'Name'`);
          continue;
        }
        
        // Extract email with fallbacks for different column names
        const email = normalizedRow.email || normalizedRow['professor email'] || normalizedRow['email id'] || '';
        
        // Validate email exists
        if (!email) {
          errors.push(`Row ${index + 2}: Missing required field 'Email'`);
          continue;
        }
        
        // Validate email format
        if (!/\S+@\S+\.\S+/.test(email)) {
          errors.push(`Row ${index + 2}: Invalid email format '${email}'`);
          continue;
        }
        
        // Normalize email for comparison
        const normalizedEmail = email.trim().toLowerCase();
        
        // Check if this email already exists in database
        if (existingEmails.has(normalizedEmail)) {
          errors.push(`Row ${index + 2}: Professor with email '${email}' already exists in the database`);
          continue;
        }
        
        // Check for duplicate within this import file
        if (processedEmails.has(normalizedEmail)) {
          errors.push(`Row ${index + 2}: Duplicate email '${email}' found in the import file`);
          continue;
        }
        
        // Create professor object
        const professor: ProfessorData = {
          name: normalizedRow.name || normalizedRow['professor name'] || normalizedRow['faculty name'] || '',
          designation: normalizedRow.designation || normalizedRow['professor designation'] || normalizedRow.role || 'Assistant Professor',
          department: normalizedRow.department || normalizedRow.dept || '',
          email: normalizedEmail,
        };
        
        // Add to list and track email
        professorsData.push(professor);
        processedEmails.add(normalizedEmail);
        existingEmails.add(normalizedEmail); // Also add to existing to prevent duplicates in later rows
      } catch (err) {
        errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    console.log(`Processed ${professorsData.length} valid professors from Excel`);
    console.log(`Found ${errors.length} errors/warnings`);
    
    // Insert data into MongoDB
    if (professorsData.length > 0) {
      try {
        // Insert all at once
        const result = await Professor.insertMany(professorsData);
        console.log(`Successfully inserted ${result.length} professors`);
        
        return NextResponse.json({
          success: true,
          imported: result.length,
          total: jsonData.length,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (error: any) {
        console.error('Error inserting professors:', error);
        
        // Check for duplicate key errors
        if (error.code === 11000 || (error.writeErrors && error.writeErrors.some((e: any) => e.err?.code === 11000))) {
          return NextResponse.json(
            { 
              error: 'Some professors could not be imported due to duplicate emails',
              details: error.message 
            },
            { status: 409 }
          );
        }
        
        throw error;
      }
    }
    
    return NextResponse.json(
      { 
        success: errors.length < jsonData.length,
        imported: 0,
        total: jsonData.length,
        errors: errors
      }
    );
  } catch (error) {
    console.error('Error importing professors:', error);
    return NextResponse.json(
      { error: 'Failed to import professors data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 