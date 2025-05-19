import { NextRequest, NextResponse } from 'next/server';
import { allocateProfessors } from '@/lib/professorAllocator';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';

// Helper function to reset models
async function resetModels() {
  // Try to delete specific models that might be causing issues
  try {
    if (mongoose.models.ProfessorDuty) {
      delete mongoose.models.ProfessorDuty;
      console.log('Successfully deleted ProfessorDuty model');
    }
  } catch (err) {
    console.error('Error deleting model:', err);
  }
  
  // Re-import to recreate
  const { default: ProfessorDuty } = await import('@/models/professorDuty');
  return true;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Reset models first
    await resetModels();
    
    const result = await allocateProfessors();
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to allocate professors' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Professor allocation API error:', error);
    return NextResponse.json(
      { error: 'Failed to process professor allocation' }, 
      { status: 500 }
    );
  }
} 