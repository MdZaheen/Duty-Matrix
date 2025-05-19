import { NextRequest, NextResponse } from 'next/server';
import { fixProfessorEmails } from '@/lib/fixProfessorEmails';

export async function POST(req: NextRequest) {
  try {
    // This should only be run by admins
    // Add proper authentication checks here in production
    
    const result = await fixProfessorEmails();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Professor emails fixed successfully',
        details: result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in fix-professor-emails API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 