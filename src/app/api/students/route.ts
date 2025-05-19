import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Student from '@/models/student';

// GET - Fetch all students with optional filters
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const branch = url.searchParams.get('branch');
    const section = url.searchParams.get('section');
    const semester = url.searchParams.get('semester');
    
    // Build query based on filters
    const query: any = {};
    if (branch) query.branch = branch;
    if (section) query.section = section;
    if (semester) query.semester = parseInt(semester);
    
    const students = await Student.find(query).sort({ section: 1, usn: 1 }).lean();
    
    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' }, 
      { status: 500 }
    );
  }
}

// POST - Create new student
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.name || !body.usn || !body.semester || !body.branch || !body.section) {
      return NextResponse.json(
        { error: 'Student name, USN, semester, branch, and section are required' }, 
        { status: 400 }
      );
    }
    
    // Check if student with same USN already exists
    const existingStudent = await Student.findOne({ usn: body.usn });
    if (existingStudent) {
      return NextResponse.json(
        { error: 'A student with this USN already exists' }, 
        { status: 400 }
      );
    }
    
    // Create new student
    const student = await Student.create(body);
    
    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' }, 
      { status: 500 }
    );
  }
} 