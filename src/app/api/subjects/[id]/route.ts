import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Subject from '@/models/subject';

// GET - Fetch a single subject by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const subject = await Subject.findById(params.id).lean();
    
    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(subject);
  } catch (error) {
    console.error('Error fetching subject:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subject' }, 
      { status: 500 }
    );
  }
}

// PUT - Update an existing subject
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.code || !body.name || !body.semester || !body.branch) {
      return NextResponse.json(
        { error: 'Subject code, name, semester and branch are required' }, 
        { status: 400 }
      );
    }
    
    // Find and update the subject
    const updatedSubject = await Subject.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    ).lean();
    
    if (!updatedSubject) {
      return NextResponse.json(
        { error: 'Subject not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedSubject);
  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json(
      { error: 'Failed to update subject' }, 
      { status: 500 }
    );
  }
}

// DELETE - Delete a subject
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const deletedSubject = await Subject.findByIdAndDelete(params.id).lean();
    
    if (!deletedSubject) {
      return NextResponse.json(
        { error: 'Subject not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { error: 'Failed to delete subject' }, 
      { status: 500 }
    );
  }
} 