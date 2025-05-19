import { NextRequest, NextResponse } from 'next/server';
import { exportProfessorDuty, exportFacultyDutyAllotmentReport } from '@/lib/excelExport';
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

export async function GET(req: NextRequest) {
  try {
    // Reset models first
    await resetModels();
    
    // Check for the report type and assessment number in the URL
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');
    const assessment = searchParams.get('assessment') || '2'; // Default to CIA-2
    
    let buffer;
    let filename;
    
    // Determine which report format to use
    if (format === 'cia') {
      // Use the new Faculty Duty Allotment format with assessment number
      buffer = await exportFacultyDutyAllotmentReport(assessment);
      filename = `faculty_duty_allotment_cia${assessment}.xlsx`;
    } else {
      // Use the regular professor duty report
      buffer = await exportProfessorDuty();
      filename = "professor_duty_chart.xlsx";
    }
    
    // Set appropriate headers for Excel file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Professor duty export error:', error);
    return NextResponse.json(
      { error: 'Failed to export professor duty chart' }, 
      { status: 500 }
    );
  }
} 