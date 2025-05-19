import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Room from '@/models/room';

interface Props {
  params: {
    id: string;
  }
}

// GET - Fetch a room by ID
export async function GET(req: NextRequest, { params }: Props) {
  try {
    await dbConnect();
    
    const id = params.id;
    const room = await Room.findById(id).lean();
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' }, 
      { status: 500 }
    );
  }
}

// PUT - Update a room
export async function PUT(req: NextRequest, { params }: Props) {
  try {
    await dbConnect();
    
    const id = params.id;
    const body = await req.json();
    const room = await Room.findByIdAndUpdate(
      id, 
      body,
      { new: true, runValidators: true }
    );
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room' }, 
      { status: 500 }
    );
  }
}

// DELETE - Delete a room
export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await dbConnect();
    
    const id = params.id;
    const room = await Room.findByIdAndDelete(id);
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json(
      { error: 'Failed to delete room' }, 
      { status: 500 }
    );
  }
} 