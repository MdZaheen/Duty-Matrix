import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Student from '@/models/student';

// GET - Fetch a single student by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const student = await Student.findById(params.id).lean();
    
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' }, 
      { status: 500 }
    );
  }
}

// PUT - Update an existing student
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // Find and update the student
    const updatedStudent = await Student.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    ).lean();
    
    if (!updatedStudent) {
      return NextResponse.json(
        { error: 'Student not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Failed to update student' }, 
      { status: 500 }
    );
  }
}

// DELETE - Delete a student
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const deletedStudent = await Student.findByIdAndDelete(params.id).lean();
    
    if (!deletedStudent) {
      return NextResponse.json(
        { error: 'Student not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Failed to delete student' }, 
      { status: 500 }
    );
  }
} 