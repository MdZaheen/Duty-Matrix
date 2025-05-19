import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Professor from '@/models/professor';

interface Props {
  params: {
    id: string;
  }
}

// GET - Fetch a professor by ID
export async function GET(req: NextRequest, { params }: Props) {
  try {
    await dbConnect();
    
    const id = params.id;
    const professor = await Professor.findById(id).lean();
    
    if (!professor) {
      return NextResponse.json(
        { error: 'Professor not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(professor);
  } catch (error) {
    console.error('Error fetching professor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch professor' }, 
      { status: 500 }
    );
  }
}

// PUT - Update a professor
export async function PUT(req: NextRequest, { params }: Props) {
  try {
    await dbConnect();
    
    const id = params.id;
    const body = await req.json();
    const professor = await Professor.findByIdAndUpdate(
      id, 
      body,
      { new: true, runValidators: true }
    );
    
    if (!professor) {
      return NextResponse.json(
        { error: 'Professor not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(professor);
  } catch (error) {
    console.error('Error updating professor:', error);
    return NextResponse.json(
      { error: 'Failed to update professor' }, 
      { status: 500 }
    );
  }
}

// DELETE - Delete a professor
export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await dbConnect();
    
    const id = params.id;
    const professor = await Professor.findByIdAndDelete(id);
    
    if (!professor) {
      return NextResponse.json(
        { error: 'Professor not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting professor:', error);
    return NextResponse.json(
      { error: 'Failed to delete professor' }, 
      { status: 500 }
    );
  }
} 