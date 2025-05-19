import { NextRequest, NextResponse } from 'next/server';
import Excel from 'exceljs';
import { format } from 'date-fns';
import dbConnect from '@/lib/db';
import ProfessorDuty from '@/models/professorDuty';
import StudentAllocation from '@/models/studentAllocation';
import Subject from '@/models/subject';
import Schedule from '@/models/schedule';
import mongoose from 'mongoose';

// Define color constants for consistent styling
const COLORS = {
  TITLE_BG: 'FFD4E6F1',     // Light blue for title backgrounds
  HEADER_BG: 'FF90C3D4',     // Medium blue for headers
  ALT_ROW_BG: 'FFF5F9FA',    // Very light blue for alternating rows
  SUBHEADER_BG: 'FFE1EEF4',  // Lighter blue for subheaders
  SIGNATURE_BG: 'FFFFF2CC',  // Light yellow for signature cells
  BORDER: 'FF9EB6C3',        // Border color
  GROUP_DIVIDER: 'FFAED4E6'  // Group divider color
};

// Helper function to reset models
async function resetModels() {
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

// Apply common styles to a worksheet
function applyCommonStyles(worksheet: Excel.Worksheet, title: string) {
  // Set default font for entire sheet
  worksheet.properties.defaultRowHeight = 20;
  
  // Add college name header (row 1)
  worksheet.getRow(1).values = ['COLLEGE NAME'];
  worksheet.getRow(1).font = { bold: true, size: 14 };
  worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Add title (row 2)
  worksheet.getRow(2).values = [title];
  worksheet.getRow(2).font = { bold: true, size: 16 };
  worksheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.TITLE_BG.slice(2) }
  };
  
  // Date row (row 3)
  worksheet.getRow(3).values = [`Generated on: ${format(new Date(), 'dd-MM-yyyy')}`];
  worksheet.getRow(3).font = { bold: true, size: 10 };
  worksheet.getRow(3).alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Add blank row (row 4)
  worksheet.getRow(4).values = [''];
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const scheduleId = searchParams.get('scheduleId');
    const subjectId = searchParams.get('subjectId');
    
    // Reset models first to avoid any issues
    await resetModels();
    await dbConnect();
    
    // Create a new workbook
    const workbook = new Excel.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Duty Allocation System';
    workbook.lastModifiedBy = 'API';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add an overview sheet
    const overviewSheet = workbook.addWorksheet('Overview', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true }
    });
    
    // Set up the overview sheet
    applyCommonStyles(overviewSheet, 'EXAM DUTY ALLOCATION REPORT');
    
    // Define the columns for overview
    overviewSheet.columns = [
      { header: 'Content', key: 'content', width: 40 },
      { header: 'Description', key: 'description', width: 60 }
    ];
    
    // Style the header row (row 5)
    const headerRow = overviewSheet.getRow(5);
    headerRow.values = ['Content', 'Description'];
    headerRow.height = 24;
    headerRow.font = { bold: true, size: 12 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.HEADER_BG.slice(2) }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
        left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
        bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
        right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
      };
    });
    
    let overviewRowCount = 5; // Starting after header row
    
    // Professor duties section
    try {
      // Get professor duties
      const duties = await ProfessorDuty.find()
        .populate('professor')
        .populate('room')
        .sort({ date: 1, shift: 1 })
        .lean();
      
      // Create professor duties sheet
      const professorSheet = workbook.addWorksheet('Professor Duties', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
      });
      
      // Set up the professor sheet
      applyCommonStyles(professorSheet, 'PROFESSOR DUTY ALLOCATION');
      
      // Define the columns
      professorSheet.columns = [
        { header: 'Professor Name', key: 'professorName', width: 25 },
        { header: 'Designation', key: 'designation', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Shift', key: 'shift', width: 15 },
        { header: 'Room Number', key: 'roomNumber', width: 15 },
        { header: 'Room Capacity', key: 'roomCapacity', width: 15 },
        { header: 'Start Time', key: 'startTime', width: 15 },
        { header: 'End Time', key: 'endTime', width: 15 },
      ];
      
      // Style the header row (row 5)
      const headerRow = professorSheet.getRow(5);
      headerRow.values = [
        'Professor Name', 'Designation', 'Date', 'Shift',
        'Room Number', 'Room Capacity', 'Start Time', 'End Time'
      ];
      headerRow.height = 24;
      headerRow.font = { bold: true, size: 12 };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.HEADER_BG.slice(2) }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
          left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
          bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
          right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
        };
      });
      
      let rowCount = 5; // Starting after header row
      
      // Add each duty as a row
      if (duties.length > 0) {
        // Group duties by date and shift for better organization
        interface DutysByDateShift {
          [key: string]: any[];
        }
        
        const dutiesByDateShift: DutysByDateShift = {};
        
        duties.forEach((duty: any) => {
          if (!duty.professor || !duty.room) return;
          
          const dateStr = format(new Date(duty.date), 'yyyy-MM-dd');
          const key = `${dateStr}_${duty.shift}`;
          
          if (!dutiesByDateShift[key]) {
            dutiesByDateShift[key] = [];
          }
          
          dutiesByDateShift[key].push(duty);
        });
        
        // Process each date-shift group
        const sortedKeys = Object.keys(dutiesByDateShift).sort();
        
        for (const key of sortedKeys) {
          const groupDuties = dutiesByDateShift[key];
          const [dateStr, shift] = key.split('_');
          const formattedDate = format(new Date(dateStr), 'dd-MM-yyyy');
          
          // Add a group header row
          rowCount++;
          const groupRow = professorSheet.getRow(rowCount);
          groupRow.values = [`Date: ${formattedDate}`, `Shift: ${shift}`];
          groupRow.height = 22;
          groupRow.font = { bold: true, size: 11 };
          
          groupRow.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: COLORS.SUBHEADER_BG.slice(2) }
            };
            cell.border = {
              top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
            };
          });
          
          // Add the duties for this group
          groupDuties.forEach((duty: any, index: number) => {
            rowCount++;
            const dutyRow = professorSheet.getRow(rowCount);
            dutyRow.values = [
              duty.professor.name,
              duty.professor.designation,
              format(new Date(duty.date), 'dd-MM-yyyy'),
              duty.shift,
              duty.room.number,
              duty.room.capacity || 'N/A',
              duty.startTime || 'N/A',
              duty.endTime || 'N/A'
            ];
            
            // Apply alternating row colors
            if (index % 2 === 1) {
              dutyRow.eachCell((cell) => {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: COLORS.ALT_ROW_BG.slice(2) }
                };
              });
            }
            
            // Add borders to cells
            dutyRow.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
                left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
                bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
                right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
              };
              
              // Center all cells except for name and designation
              if (Number(cell.col) !== 1 && Number(cell.col) !== 2) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
              } else {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
              }
            });
          });
          
          // Add a spacing row after each group
          if (key !== sortedKeys[sortedKeys.length - 1]) {
            rowCount++;
            professorSheet.getRow(rowCount).values = [''];
          }
        }
        
        // Add entry to overview
        overviewRowCount++;
        const overviewRow = overviewSheet.getRow(overviewRowCount);
        overviewRow.values = ['Professor Duties', `Total ${duties.length} professor duties allocated`];
        overviewRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
          };
        });
      } else {
        rowCount++;
        const noDataRow = professorSheet.getRow(rowCount);
        noDataRow.values = ['No duties found', '', '', '', '', '', '', ''];
        noDataRow.font = { italic: true };
        noDataRow.alignment = { horizontal: 'center' };
        
        // Add entry to overview
        overviewRowCount++;
        const overviewRow = overviewSheet.getRow(overviewRowCount);
        overviewRow.values = ['Professor Duties', 'No duties found'];
        overviewRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
          };
        });
      }
    } catch (error) {
      console.error('Error creating professor duties sheet:', error);
      overviewRowCount++;
      const errorRow = overviewSheet.getRow(overviewRowCount);
      errorRow.values = ['Professor Duties', 'Failed to generate professor duties sheet'];
      errorRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
          left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
          bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
          right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
        };
      });
    }
    
    // Student allocations section
    if (scheduleId && subjectId) {
      try {
        // Get subject and schedule details
        const schedule = await Schedule.findById(scheduleId).lean();
        const subject = await Subject.findById(subjectId).lean();
        
        if (!schedule || !subject) {
          throw new Error('Schedule or subject not found');
        }
        
        // Get student allocations
        const allocations = await StudentAllocation.find({
          schedule: scheduleId,
          subject: subjectId
        })
          .populate('student')
          .populate('room')
          .populate('subject')
          .sort({ 'room.number': 1, seatNumber: 1 })
          .lean();
        
        // Create student allocations sheet
        const worksheetName = `${(subject as any).code || 'Subject'} - ${schedule.shift}`;
        const studentSheet = workbook.addWorksheet(worksheetName, {
          pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
        });
        
        // Set up the student sheet
        applyCommonStyles(studentSheet, 'STUDENT SEATING ARRANGEMENT');
        
        // Add exam details (row 3)
        studentSheet.getRow(3).values = [
          `Subject: ${(subject as any).name || 'Unknown'} (${(subject as any).code || 'No Code'}) - ${schedule.shift} - ${format(new Date(schedule.date), 'dd-MM-yyyy')}`
        ];
        studentSheet.getRow(3).font = { bold: true, size: 11 };
        studentSheet.getRow(3).alignment = { horizontal: 'center', vertical: 'middle' };
        studentSheet.getRow(3).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.SUBHEADER_BG.slice(2) }
        };
        
        // Define the columns
        studentSheet.columns = [
          { header: 'Room', key: 'roomNumber', width: 12 },
          { header: 'Seat', key: 'seatNumber', width: 10 },
          { header: 'USN', key: 'usn', width: 18 },
          { header: 'Student Name', key: 'name', width: 25 },
          { header: 'Section', key: 'section', width: 10 },
          { header: 'Subject Code', key: 'subjectCode', width: 15 },
          { header: 'Subject Name', key: 'subjectName', width: 20 },
          { header: 'Attendance', key: 'attendance', width: 12 },
        ];
        
        // Style the header row (row 5)
        const headerRow = studentSheet.getRow(5);
        headerRow.values = [
          'Room', 'Seat', 'USN', 'Student Name', 'Section', 
          'Subject Code', 'Subject Name', 'Attendance'
        ];
        headerRow.height = 24;
        headerRow.font = { bold: true, size: 12 };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.HEADER_BG.slice(2) }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
          };
        });
        
        let rowCount = 5; // Starting after header row
        
        // Add each allocation as a row
        if (allocations.length > 0) {
          // Group allocations by room
          interface AllocationsByRoom {
            [key: string]: any[];
          }
          
          const allocationsByRoom: AllocationsByRoom = {};
          
          allocations.forEach((allocation: any) => {
            if (!allocation.student || !allocation.room || !allocation.subject) return;
            
            const roomNumber = allocation.room.number;
            if (!allocationsByRoom[roomNumber]) {
              allocationsByRoom[roomNumber] = [];
            }
            allocationsByRoom[roomNumber].push(allocation);
          });
          
          // Process each room group
          const sortedRooms = Object.keys(allocationsByRoom).sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (isNaN(numA) || isNaN(numB)) {
              return a.localeCompare(b);
            }
            return numA - numB;
          });
          
          for (const roomNumber of sortedRooms) {
            const roomAllocations = allocationsByRoom[roomNumber];
            
            // Add a room header
            rowCount++;
            const roomHeaderRow = studentSheet.getRow(rowCount);
            roomHeaderRow.values = [
              `Room: ${roomNumber}`,
              `Capacity: ${roomAllocations[0].room.capacity}`,
              `Students: ${roomAllocations.length}`,
              '', '', '', '', ''
            ];
            roomHeaderRow.height = 22;
            roomHeaderRow.font = { bold: true, size: 11 };
            
            roomHeaderRow.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.SUBHEADER_BG.slice(2) }
              };
              cell.border = {
                top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
                left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
                bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
                right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
              };
              
              // Align text to the left for the first 3 cells
              if (Number(cell.col) === 1 || Number(cell.col) === 2 || Number(cell.col) === 3) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
              } else {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
              }
            });
            
            // Sort by seat number
            roomAllocations.sort((a: any, b: any) => a.seatNumber - b.seatNumber);
            
            // Add student rows
            roomAllocations.forEach((allocation: any, index: number) => {
              rowCount++;
              const studentRow = studentSheet.getRow(rowCount);
              studentRow.values = [
                allocation.room.number,
                allocation.seatNumber,
                allocation.student.usn,
                allocation.student.name,
                allocation.student.section,
                allocation.subject.code,
                allocation.subject.name,
                allocation.attendance ? 'Present' : ''
              ];
              
              // Apply alternating row colors
              if (index % 2 === 1) {
                studentRow.eachCell((cell) => {
                  cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: COLORS.ALT_ROW_BG.slice(2) }
                  };
                });
              }
              
              // Add borders to cells
              studentRow.eachCell((cell) => {
                cell.border = {
                  top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
                  left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
                  bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
                  right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
                };
                
                // Center all cells except for name and USN
                if (Number(cell.col) !== 3 && Number(cell.col) !== 4) {
                  cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else {
                  cell.alignment = { horizontal: 'left', vertical: 'middle' };
                }
              });
            });
            
            // Add a spacing row after each room (except the last one)
            if (roomNumber !== sortedRooms[sortedRooms.length - 1]) {
              rowCount++;
              studentSheet.getRow(rowCount).values = [''];
            }
          }
          
          // Add entry to overview
          overviewRowCount++;
          const overviewRow = overviewSheet.getRow(overviewRowCount);
          overviewRow.values = [
            'Student Allocations',
            `Total ${allocations.length} students allocated for ${(subject as any).name} (${(subject as any).code}) on ${format(new Date(schedule.date), 'dd-MM-yyyy')} - ${schedule.shift}`
          ];
          overviewRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
            };
          });
        } else {
          rowCount++;
          const noDataRow = studentSheet.getRow(rowCount);
          noDataRow.values = ['No students allocated', '', '', '', '', '', '', ''];
          noDataRow.font = { italic: true };
          noDataRow.alignment = { horizontal: 'center' };
          
          // Add entry to overview
          overviewRowCount++;
          const overviewRow = overviewSheet.getRow(overviewRowCount);
          overviewRow.values = ['Student Allocations', 'No student allocations found'];
          overviewRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
            };
          });
        }
      } catch (error) {
        console.error('Error creating student allocations sheet:', error);
        overviewRowCount++;
        const errorRow = overviewSheet.getRow(overviewRowCount);
        errorRow.values = ['Student Allocations', 'Failed to generate student allocations sheet'];
        errorRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
            right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
          };
        });
      }
    } else {
      // Add entry to overview if no schedule/subject provided
      overviewRowCount++;
      const notIncludedRow = overviewSheet.getRow(overviewRowCount);
      notIncludedRow.values = ['Student Allocations', 'Not included (scheduleId and subjectId are required)'];
      notIncludedRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
          left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
          bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
          right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
        };
      });
    }
    
    // Add generation metadata to overview
    overviewRowCount += 2;
    const dateRow = overviewSheet.getRow(overviewRowCount);
    dateRow.values = ['Generated Date', format(new Date(), 'dd-MM-yyyy HH:mm:ss')];
    dateRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
        left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
        bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
        right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
      };
    });
    
    // Create a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Set appropriate headers for Excel file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="duty_allocation_report.xlsx"`);
    
    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Combined export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate combined export' }, 
      { status: 500 }
    );
  }
}