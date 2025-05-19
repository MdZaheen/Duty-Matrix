import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Room from '@/models/room';

// GET - Fetch all rooms
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const rooms = await Room.find({ isActive: true }).sort({ building: 1, floor: 1, number: 1 }).lean();
    
    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' }, 
      { status: 500 }
    );
  }
}

// POST - Create new room
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.number || !body.building) {
      return NextResponse.json(
        { error: 'Room number and building are required' }, 
        { status: 400 }
      );
    }
    
    // Create new room
    const room = await Room.create({
      ...body,
      isActive: body.isActive !== undefined ? body.isActive : true
    });
    
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' }, 
      { status: 500 }
    );
  }
} 