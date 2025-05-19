import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Schedule from '@/models/schedule';

interface Props {
  params: {
    id: string;
  }
}

// GET - Fetch a schedule by ID
export async function GET(req: NextRequest, { params }: Props) {
  try {
    await dbConnect();
    
    const schedule = await Schedule.findById(params.id).lean();
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' }, 
      { status: 500 }
    );
  }
}

// PUT - Update a schedule
export async function PUT(req: NextRequest, { params }: Props) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const schedule = await Schedule.findByIdAndUpdate(
      params.id, 
      body,
      { new: true, runValidators: true }
    );
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' }, 
      { status: 500 }
    );
  }
}

// DELETE - Delete a schedule
export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await dbConnect();
    
    const schedule = await Schedule.findByIdAndDelete(params.id);
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' }, 
      { status: 500 }
    );
  }
} 