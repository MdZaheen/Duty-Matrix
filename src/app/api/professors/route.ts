import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Professor from '@/models/professor';

// GET - Fetch all professors
export async function GET(req: NextRequest) {
  try {
    console.log('GET /api/professors: Connecting to database');
    await dbConnect();
    
    console.log('GET /api/professors: Fetching professors');
    const professors = await Professor.find()
      .sort({ name: 1 })
      .lean();
    
    console.log(`GET /api/professors: Found ${professors.length} professors`);
    return NextResponse.json(professors);
  } catch (error) {
    console.error('Error fetching professors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch professors', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}

// POST - Create new professor
export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/professors: Connecting to database');
    await dbConnect();
    
    const body = await req.json();
    console.log('POST /api/professors: Request body', body);
    
    // Validate required fields
    if (!body.name || !body.designation) {
      console.log('POST /api/professors: Missing required fields');
      return NextResponse.json(
        { error: 'Name and designation are required' }, 
        { status: 400 }
      );
    }
    
    // Validate email
    if (!body.email) {
      console.log('POST /api/professors: Missing email');
      return NextResponse.json(
        { error: 'Email is required' }, 
        { status: 400 }
      );
    }
    
    // Trim and normalize email
    body.email = body.email.trim().toLowerCase();
    
    // Validate email format
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(body.email)) {
      console.log('POST /api/professors: Invalid email format');
      return NextResponse.json(
        { error: 'Invalid email format' }, 
        { status: 400 }
      );
    }
    
    // Check for duplicate email - using case-insensitive query
    const existingProfessor = await Professor.findOne({ 
      email: { $regex: `^${body.email}$`, $options: 'i' } 
    });
    
    if (existingProfessor) {
      console.log('POST /api/professors: Duplicate email');
      return NextResponse.json(
        { error: 'A professor with this email already exists' }, 
        { status: 409 }
      );
    }
    
    // Create new professor
    console.log('POST /api/professors: Creating new professor');
    const professor = await Professor.create({
      ...body,
      dutyCount: body.dutyCount || 0
    });
    
    console.log('POST /api/professors: Created professor', professor._id);
    return NextResponse.json(professor, { status: 201 });
  } catch (error: any) {
    console.error('Error creating professor:', error);
    
    // Check for MongoDB duplicate key error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return NextResponse.json(
        { error: 'A professor with this email already exists' }, 
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create professor', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 