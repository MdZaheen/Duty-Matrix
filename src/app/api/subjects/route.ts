import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Subject from '@/models/subject';

// GET - Fetch all subjects with optional filters
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const url = new URL(req.url);
    const branch = url.searchParams.get('branch');
    const semester = url.searchParams.get('semester');
    
    // Build query based on filters
    const query: any = {};
    if (branch) query.branch = branch;
    if (semester) query.semester = parseInt(semester);
    
    const subjects = await Subject.find(query).sort({ code: 1 }).lean();
    
    return NextResponse.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' }, 
      { status: 500 }
    );
  }
}

// POST - Create new subject
export async function POST(req: NextRequest) {
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
    
    // Create new subject
    const subject = await Subject.create(body);
    
    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Failed to create subject' }, 
      { status: 500 }
    );
  }
} 