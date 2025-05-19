import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProfessorDuty from '@/models/professorDuty';
import Professor from '@/models/professor';

export async function POST(req: NextRequest) {
  try {
    console.log('Resetting all professor duties...');
    await dbConnect();
    
    // Delete all existing professor duties
    const deletionResult = await ProfessorDuty.deleteMany({});
    console.log(`Deleted ${deletionResult.deletedCount} professor duties`);
    
    // Reset all professor duty counts to zero
    await Professor.updateMany({}, { dutyCount: 0 });
    console.log('Reset all professor duty counts to zero');
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${deletionResult.deletedCount} duties and reset professor duty counts`
    });
  } catch (error) {
    console.error('Error resetting professor duties:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reset professor duties',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
} 