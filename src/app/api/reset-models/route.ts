import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    console.log('Resetting Mongoose models...');
    await dbConnect();
    
    // Get all models before reset
    const beforeModels = Object.keys(mongoose.models);
    
    // Try to delete specific models
    const modelsToReset = ['ProfessorDuty'];
    
    modelsToReset.forEach(modelName => {
      try {
        if (mongoose.models[modelName]) {
          delete mongoose.models[modelName];
          console.log(`Deleted model: ${modelName}`);
        }
      } catch (err) {
        console.error(`Error deleting model ${modelName}:`, err);
      }
    });
    
    // Re-import the models to recreate them
    const { default: ProfessorDuty } = await import('@/models/professorDuty');
    
    // Get models after reset
    const afterModels = Object.keys(mongoose.models);
    
    return NextResponse.json({
      success: true,
      message: `Reset ${modelsToReset.length} models`,
      beforeModels,
      afterModels
    });
  } catch (error) {
    console.error('Error resetting models:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reset models',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
} 