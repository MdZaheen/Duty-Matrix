import Excel from 'exceljs';
import { format } from 'date-fns';
import ProfessorDuty from '@/models/professorDuty';
import StudentAllocation from '@/models/studentAllocation';
import Subject, { ISubject } from '@/models/subject';
import Schedule, { ISchedule } from '@/models/schedule';
import dbConnect from './db';
import { readFileSync } from 'fs';
import path from 'path';
import Student from '@/models/student';

interface ProfessorDocument {
  _id: any;
  name: string;
  designation: string;
}

interface RoomDocument {
  _id: any;
  number: string;
  capacity: number;
}

interface ProfessorDutyDocument {
  _id: any;
  professor: ProfessorDocument;
  room: RoomDocument;
  date: Date;
  shift: string;
  startTime?: string;
  endTime?: string;
}

interface StudentDocument {
  _id: any;
  usn: string;
  name: string;
  section: string;
}

interface StudentAllocationDocument {
  _id: any;
  student: StudentDocument;
  room: RoomDocument;
  schedule: any;
  subject: any;
  seatNumber: number;
  attendance: boolean;
  ciaMarks?: {
    cia1: number | null;
    cia2: number | null;
    cia3: number | null;
  }
}

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

/**
 * Apply common styles to a worksheet
 */
function applyCommonStyles(worksheet: Excel.Worksheet) {
  // Set default font for entire sheet
  worksheet.properties.defaultRowHeight = 20;

  // Add worksheet protection with exceptions for data entry
  worksheet.protect('', {
    formatCells: true,
    formatColumns: true,
    formatRows: true,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: true,
    pivotTables: false
  });
}

/**
 * Export professor duty allocations to Excel
 */
export async function exportProfessorDuty(): Promise<any> {
  await dbConnect();

  // Create a new workbook and worksheet
  const workbook = new Excel.Workbook();

  // Set workbook properties
  workbook.creator = 'Duty Allocation System';
  workbook.lastModifiedBy = 'API';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Professor Duties', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.7, right: 0.7,
        top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3
      }
    }
  });

  // Apply common styles
  applyCommonStyles(worksheet);

  // Define the columns
  worksheet.columns = [
    { header: 'Professor Name', key: 'professorName', width: 25 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Shift', key: 'shift', width: 15 },
    { header: 'Room Number', key: 'roomNumber', width: 15 },
    { header: 'Room Capacity', key: 'roomCapacity', width: 15 },
    { header: 'Start Time', key: 'startTime', width: 15 },
    { header: 'End Time', key: 'endTime', width: 15 },
    { header: 'Signature', key: 'signature', width: 20 },
  ];

  // Add college name header (row 1)
  worksheet.mergeCells('A1:I1');
  const collegeCell = worksheet.getCell('A1');
  collegeCell.value = 'COLLEGE NAME';
  collegeCell.font = {
    bold: true,
    size: 14,
    color: { argb: 'FF000000' }
  };
  collegeCell.alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };

  // Add title row (row 2)
  worksheet.mergeCells('A2:I2');
  const titleCell = worksheet.getCell('A2');
  titleCell.value = 'PROFESSOR DUTY ALLOCATION CHART';
  titleCell.font = {
    bold: true,
    size: 16,
    color: { argb: '000000' }
  };
  titleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.TITLE_BG.slice(2) }
  };

  // Add date information (row 3)
  worksheet.mergeCells('A3:I3');
  const dateInfoCell = worksheet.getCell('A3');
  dateInfoCell.value = `Generated on: ${format(new Date(), 'dd-MM-yyyy')}`;
  dateInfoCell.font = {
    bold: true,
    size: 10
  };
  dateInfoCell.alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };

  // Add blank row (row 4)
  worksheet.addRow([]);

  // Style the header row (row 5)
  const headerRow = worksheet.addRow([
    'Professor Name', 'Designation', 'Date', 'Shift',
    'Room Number', 'Room Capacity', 'Start Time', 'End Time', 'Signature'
  ]);

  headerRow.height = 24;
  headerRow.font = {
    bold: true,
    size: 12,
    color: { argb: 'FF000000' }
  };
  headerRow.alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true
  };

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

  try {
    // Get all duties with populated fields
    const duties = await ProfessorDuty.find()
      .populate('professor')
      .populate('room')
      .sort({ date: 1, shift: 1, 'room.number': 1 })
      .lean();

    console.log(`Exporting ${duties.length} professor duties`);

    if (duties.length === 0) {
      // Add a default "no data" row
      const noDataRow = worksheet.addRow({
        professorName: 'No duties found',
        designation: '',
        date: '',
        shift: '',
        roomNumber: '',
        roomCapacity: '',
        startTime: '',
        endTime: '',
        signature: ''
      });

      noDataRow.font = { italic: true };
      noDataRow.alignment = { horizontal: 'center' };
    } else {
      // Group duties by date and shift
      const dutiesByDateShift: Record<string, any[]> = {};

      duties.forEach(duty => {
        // Using any type to avoid TypeScript errors with mongoose documents
        const typedDuty = duty as any;
        if (!typedDuty.professor || !typedDuty.room) {
          console.warn('Skipping duty with missing professor or room:', typedDuty._id);
          return;
        }

        const dateStr = format(new Date(typedDuty.date), 'yyyy-MM-dd');
        const key = `${dateStr}_${typedDuty.shift}`;

        if (!dutiesByDateShift[key]) {
          dutiesByDateShift[key] = [];
        }

        dutiesByDateShift[key].push(typedDuty);
      });

      // Process each date-shift group with a header
      let lastDate: string | null = null;
      let lastShift: string | null = null;

      // Sort keys to maintain chronological order
      const sortedKeys = Object.keys(dutiesByDateShift).sort();
      let rowCount = 0;

      for (const key of sortedKeys) {
        const groupDuties = dutiesByDateShift[key];
        const [dateStr, shift] = key.split('_');
        const formattedDate = format(new Date(dateStr), 'dd-MM-yyyy');

        // Add a subheader row for this date-shift if it's different
        if (formattedDate !== lastDate || shift !== lastShift) {
          // Add a spacing row if not the first group
          if (lastDate !== null) {
            worksheet.addRow([]);
            rowCount++;
          }

          // Add date-shift header
          const groupHeaderRow = worksheet.addRow([
            `Date: ${formattedDate}`, `Shift: ${shift}`, '', '', '', '', '', '', ''
          ]);
          rowCount++;

          // Style the group header
          groupHeaderRow.height = 22;
          groupHeaderRow.font = { bold: true, size: 11 };
          groupHeaderRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
          groupHeaderRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

          // Add fill to the entire row
          groupHeaderRow.eachCell((cell) => {
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

          lastDate = formattedDate;
          lastShift = shift;
        }

        // Add each duty as a row
        groupDuties.forEach((duty: any, index: number) => {
          const dutyRow = worksheet.addRow({
            professorName: duty.professor.name,
            designation: duty.professor.designation,
            date: format(new Date(duty.date), 'dd-MM-yyyy'),
            shift: duty.shift,
            roomNumber: duty.room.number,
            roomCapacity: duty.room.capacity,
            startTime: duty.startTime || 'N/A',
            endTime: duty.endTime || 'N/A',
            signature: '' // Empty cell for signature
          });
          rowCount++;

          // Add alternating row colors
          if (rowCount % 2 === 0) {
            dutyRow.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.ALT_ROW_BG.slice(2) }
              };
            });
          }

          // Make signature cell stand out
          const signatureCell = dutyRow.getCell(9);
          signatureCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.SIGNATURE_BG.slice(2) }
          };

          // Add borders to every cell
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
      }
    }

    // Add footer
    worksheet.addRow([]);
    const footerRow = worksheet.addRow(['', '', '', '', '', '', '', '', '']);
    const footerCell = footerRow.getCell(1);
    footerCell.value = `Generated by: Duty Allocation System - ${format(new Date(), 'dd-MM-yyyy HH:mm')}`;
    footerCell.font = { italic: true, size: 10 };

    // Create a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error('Error generating professor duty Excel file:', error);
    throw error;
  }
}

/**
 * Export student room allocations to Excel
 */
export async function exportStudentAllocation(scheduleId: string, subjectId: string): Promise<any> {
  await dbConnect();

  // Create a new workbook
  const workbook = new Excel.Workbook();

  // Set workbook properties
  workbook.creator = 'Duty Allocation System';
  workbook.lastModifiedBy = 'API';
  workbook.created = new Date();
  workbook.modified = new Date();

  try {
    // Get schedule and subject details for headers
    const schedule = await Schedule.findById(scheduleId).lean();
    const subject = await Subject.findById(subjectId).lean();

    if (!schedule || !subject) {
      throw new Error('Schedule or subject not found');
    }

    // Type assertions to work with the mongoose documents
    const scheduleData = schedule as unknown as ISchedule;
    const subjectData = subject as unknown as ISubject;

    const examDate = format(new Date(scheduleData.date), 'dd-MM-yyyy');

    // Create worksheet with detailed name
    const worksheetName = `${subjectData.code || 'Subject'} - ${scheduleData.shift}`;
    const worksheet = workbook.addWorksheet(worksheetName, {
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.7, right: 0.7,
          top: 0.75, bottom: 0.75,
          header: 0.3, footer: 0.3
        }
      }
    });

    // Apply common styles
    applyCommonStyles(worksheet);

    // Define the columns
    worksheet.columns = [
      { header: 'Room', key: 'roomNumber', width: 13 },
      { header: 'Seat', key: 'seatNumber', width: 10 },
      { header: 'USN', key: 'usn', width: 18 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Subject Code', key: 'subjectCode', width: 13 },
      { header: 'Subject Name', key: 'subjectName', width: 20 },
      { header: 'CIA-1', key: 'cia1', width: 8 },
      { header: 'CIA-2', key: 'cia2', width: 8 },
      { header: 'CIA-3', key: 'cia3', width: 8 },
      { header: 'Attendance', key: 'attendance', width: 12 },
      { header: 'Invigilator', key: 'invigilator', width: 20 },
    ];

    // Add college name header (row 1)
    worksheet.mergeCells('A1:L1');
    const collegeCell = worksheet.getCell('A1');
    collegeCell.value = 'COLLEGE NAME';
    collegeCell.font = {
      bold: true,
      size: 14,
      color: { argb: '000000' }
    };
    collegeCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add title rows (row 2)
    worksheet.mergeCells('A2:L2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'STUDENT SEATING ARRANGEMENT';
    titleCell.font = {
      bold: true,
      size: 16,
      color: { argb: '000000' }
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.TITLE_BG.slice(2) }
    };

    // Add exam details (row 3)
    worksheet.mergeCells('A3:L3');
    const examDetailsCell = worksheet.getCell('A3');
    examDetailsCell.value = `Subject: ${subjectData.name || 'Unknown Subject'} (${subjectData.code || 'No Code'}) - ${scheduleData.shift} Shift - ${examDate}`;
    examDetailsCell.font = {
      bold: true,
      size: 12
    };
    examDetailsCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    examDetailsCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.SUBHEADER_BG.slice(2) }
    };

    // Add blank row (row 4)
    worksheet.addRow([]);

    // Style the header row (row 5)
    const headerRow = worksheet.addRow([
      'Room', 'Seat', 'USN', 'Student Name', 'Section', 'Subject Code',
      'Subject Name', 'CIA-1', 'CIA-2', 'CIA-3', 'Attendance', 'Invigilator'
    ]);

    headerRow.height = 24;
    headerRow.font = {
      bold: true,
      size: 12,
      color: { argb: '000000' }
    };
    headerRow.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

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

    // Get all allocations with populated fields
    const query = {
      schedule: scheduleId,
      subject: subjectId
    };

    const allocations = await StudentAllocation.find(query)
      .populate('student')
      .populate('room')
      .populate('schedule')
      .populate('subject')
      .sort({ 'room.number': 1, seatNumber: 1 })
      .lean();

    if (allocations.length === 0) {
      const noDataRow = worksheet.addRow({
        roomNumber: 'No students allocated',
        seatNumber: '',
        usn: '',
        name: '',
        section: '',
        subjectCode: '',
        subjectName: '',
        cia1: '',
        cia2: '',
        cia3: '',
        attendance: '',
        invigilator: ''
      });

      noDataRow.font = { italic: true };
      noDataRow.alignment = { horizontal: 'center' };
    } else {
      // Group allocations by room
      const allocationsByRoom: Record<string, any[]> = {};

      allocations.forEach(allocation => {
        // Using any type to avoid TypeScript errors with mongoose documents
        const typedAllocation = allocation as any;
        const roomNumber = typedAllocation.room.number;

        if (!allocationsByRoom[roomNumber]) {
          allocationsByRoom[roomNumber] = [];
        }

        allocationsByRoom[roomNumber].push(typedAllocation);
      });

      // Process each room group with a header
      const sortedRooms = Object.keys(allocationsByRoom).sort((a, b) => {
        // Convert to numbers for proper numeric sorting (if they're numeric room numbers)
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (isNaN(numA) || isNaN(numB)) {
          // If not numbers, sort alphabetically
          return a.localeCompare(b);
        }
        return numA - numB;
      });

      let rowCount = 0;

      for (const roomNumber of sortedRooms) {
        const roomAllocations = allocationsByRoom[roomNumber];

        // Add a room header
        const roomCapacity = roomAllocations[0].room.capacity;
        const roomHeaderRow = worksheet.addRow([
          `Room: ${roomNumber}`,
          `Capacity: ${roomCapacity}`,
          `Students: ${roomAllocations.length}`,
          '', '', '', '', '', '', '', '', ''
        ]);
        rowCount++;

        // Style the room header
        roomHeaderRow.height = 22;
        roomHeaderRow.font = { bold: true, size: 11 };

        // Add fill to the entire row
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

          // Align text to the left for the first cell, center for others
          if (Number(cell.col) === 1 || Number(cell.col) === 2 || Number(cell.col) === 3) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });

        // Sort by seat number within the room
        roomAllocations.sort((a, b) => a.seatNumber - b.seatNumber);

        // Add each allocation as a row
        roomAllocations.forEach((allocation, index) => {
          const studentRow = worksheet.addRow({
            roomNumber: allocation.room.number,
            seatNumber: allocation.seatNumber,
            usn: allocation.student.usn,
            name: allocation.student.name,
            section: allocation.student.section,
            subjectCode: allocation.subject.code,
            subjectName: allocation.subject.name,
            cia1: allocation.ciaMarks?.cia1 || '',
            cia2: allocation.ciaMarks?.cia2 || '',
            cia3: allocation.ciaMarks?.cia3 || '',
            attendance: allocation.attendance ? 'Present' : '',
            invigilator: ''  // Empty cell for invigilator to sign
          });
          rowCount++;

          // Add alternating row colors
          if (index % 2 === 1) {
            studentRow.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.ALT_ROW_BG.slice(2) }
              };
            });
          }

          // Make the invigilator cell stand out
          const invigilatorCell = studentRow.getCell(12);
          invigilatorCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.SIGNATURE_BG.slice(2) }
          };

          // Add borders to every cell
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
          worksheet.addRow([]);
          rowCount++;
        }
      }

      // Add summary statistics
      worksheet.addRow([]);
      const summaryRow = worksheet.addRow([
        'Summary:',
        '',
        `Total Students: ${allocations.length}`,
        `Total Rooms: ${sortedRooms.length}`,
        '',
        `Semester: ${subjectData.semester || 'Unknown'}`,
        `Branch: ${subjectData.branch || 'Unknown'}`,
        '', '', '', '', ''
      ]);

      summaryRow.font = { bold: true };
      summaryRow.eachCell((cell) => {
        if (Number(cell.col) === 1 || Number(cell.col) === 3 || Number(cell.col) === 4 || Number(cell.col) === 6 || Number(cell.col) === 7) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    }

    // Add footer
    worksheet.addRow([]);
    const footerRow = worksheet.addRow(['', '', '', '', '', '', '', '', '', '', '', '']);
    const footerCell = footerRow.getCell(1);
    footerCell.value = `Generated by: Duty Allocation System - ${format(new Date(), 'dd-MM-yyyy HH:mm')}`;
    footerCell.font = { italic: true, size: 10 };

    // Create a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error('Error generating student allocation Excel file:', error);
    throw error;
  }
}

/**
 * Helper function to convert column index to Excel column letter (A, B, C, ..., AA, AB, etc.)
 * 
 * @param columnIndex The 1-based column index (1 for A, 2 for B, etc.)
 * @returns The Excel column letter
 */
function columnToLetter(columnIndex: number): string {
  let temp: number;
  let letter = '';

  while (columnIndex > 0) {
    temp = (columnIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    columnIndex = (columnIndex - temp - 1) / 26;
  }

  return letter;
}

/**
 * Export Student Seating Arrangement in CIA format
 * Matches the professor duty CIA format with college header and proper styling
 * 
 * @param semester The semester to filter students (optional - if not provided, exports all)
 * @param scheduleId Optional schedule ID to filter by specific exam schedule
 * @param assessmentNumber The CIA assessment number (1, 2, or 3) - defaults to '2'
 */
export async function exportStudentSeatingCIAFormat(semester?: number, scheduleId?: string, assessmentNumber: string = '2'): Promise<any> {
  await dbConnect();

  // Create a new workbook and worksheet
  const workbook = new Excel.Workbook();

  // Set workbook properties
  workbook.creator = 'Duty Allocation System';
  workbook.lastModifiedBy = 'API';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Student Seating Arrangement', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5, right: 0.5,
        top: 0.5, bottom: 0.5,
        header: 0.3, footer: 0.3
      }
    }
  });

  try {
    // Build query for student allocations
    const query: any = {};
    if (scheduleId) {
      query.schedule = scheduleId;
    }

    // Get all allocations with populated fields
    let allocations = await StudentAllocation.find(query)
      .populate('student')
      .populate('room')
      .populate('schedule')
      .populate('subject')
      .sort({ 'room.number': 1, seatNumber: 1 })
      .lean();

    // Filter by semester if specified
    if (semester) {
      allocations = allocations.filter((allocation: any) =>
        allocation.subject && allocation.subject.semester === semester
      );
    }

    console.log(`Generating student seating report with ${allocations.length} allocations for semester: ${semester || 'all'}`);

    // Determine semester type for display
    let semesterType = 'Even'; // Default
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    if (semester) {
      semesterType = semester % 2 === 0 ? 'Even' : 'Odd';
    }

    // Add college logo
    const logoCell = worksheet.getCell('A1');
    logoCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Try to add the college logo
    try {
      const fs = require('fs');
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');

      if (fs.existsSync(logoPath)) {
        const logoImage = workbook.addImage({
          filename: logoPath,
          extension: 'png',
        });
        worksheet.addImage(logoImage, {
          tl: { col: 0, row: 0 },
          ext: { width: 80, height: 80 },
          editAs: 'oneCell'
        });
      } else {
        console.log('College logo not found at path:', logoPath);
        logoCell.value = 'LOGO';
        logoCell.font = {
          name: 'Arial',
          bold: true,
          size: 12,
        };
      }
    } catch (error) {
      console.warn('Error adding college logo, using placeholder:', error);
      logoCell.value = 'LOGO';
      logoCell.font = {
        name: 'Arial',
        bold: true,
        size: 12,
      };
    }

    // Add college name header
    worksheet.mergeCells('B1:L1');
    const collegeCell = worksheet.getCell('B1');
    collegeCell.value = 'DAYANANDA SAGAR COLLEGE OF ENGINEERING';
    collegeCell.font = {
      name: 'Arial',
      bold: true,
      size: 14,
    };
    collegeCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add college address
    worksheet.mergeCells('B2:L2');
    const addressCell = worksheet.getCell('B2');
    addressCell.value = '(An Autonomous Institute affiliated to Visvesvaraya Technological University (VTU), Belagavi,';
    addressCell.font = {
      name: 'Arial',
      size: 8,
    };
    addressCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    worksheet.mergeCells('B3:L3');
    const address2Cell = worksheet.getCell('B3');
    address2Cell.value = 'Approved by AICTE and UGC, Accredited by NBA (Tier 1: 2023-2025), NAAC "A+" Certified Institution)';
    address2Cell.font = {
      name: 'Arial',
      size: 8,
    };
    address2Cell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    worksheet.mergeCells('B4:L4');
    const address3Cell = worksheet.getCell('B4');
    address3Cell.value = 'Shavige Malleshwara Hills, Kumaraswamy Layout, Bengaluru - 560 111, India';
    address3Cell.font = {
      name: 'Arial',
      size: 8,
    };
    address3Cell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add department name
    worksheet.mergeCells('A6:L6');
    const deptCell = worksheet.getCell('A6');
    deptCell.value = 'Department of Information Science and Engineering';
    deptCell.font = {
      name: 'Arial',
      bold: true,
      size: 12,
    };
    deptCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add accreditation line
    worksheet.mergeCells('A7:L7');
    const accreditationCell = worksheet.getCell('A7');
    accreditationCell.value = '(Accredited by NBA Tier 1: 2022-2025)';
    accreditationCell.font = {
      name: 'Arial',
      size: 10,
      italic: true
    };
    accreditationCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add date
    worksheet.mergeCells('J8:L8');
    const dateCell = worksheet.getCell('J8');
    dateCell.value = `Date: ${format(new Date(), 'dd/MM/yyyy')}`;
    dateCell.font = {
      name: 'Arial',
      size: 10,
    };
    dateCell.alignment = {
      horizontal: 'right',
      vertical: 'middle'
    };

    // Add title
    worksheet.mergeCells('A9:L9');
    const titleCell = worksheet.getCell('A9');
    titleCell.value = `Student Seating Arrangement Report - CIA-${assessmentNumber}`;
    titleCell.font = {
      name: 'Arial',
      bold: true,
      underline: true,
      size: 12,
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add subtitle
    worksheet.mergeCells('A10:L10');
    const subtitleCell = worksheet.getCell('A10');
    const semesterText = semester ? `Semester ${semester} (${semesterType})` : 'All Semesters';
    subtitleCell.value = `${semesterText} - ${academicYear}`;
    subtitleCell.font = {
      name: 'Arial',
      bold: true,
      size: 12,
    };
    subtitleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Starting row for the data
    let currentRow = 12;

    // Define columns for student data
    const columns = [
      { header: 'Room No.', key: 'roomNumber', width: 12 },
      { header: 'Seat No.', key: 'seatNumber', width: 10 },
      { header: 'USN', key: 'usn', width: 18 },
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Semester', key: 'semester', width: 10 },
      { header: 'Subject Code', key: 'subjectCode', width: 15 },
      { header: 'Subject Name', key: 'subjectName', width: 25 },
      { header: 'CIA-1', key: 'cia1', width: 8 },
      { header: 'CIA-2', key: 'cia2', width: 8 },
      { header: 'CIA-3', key: 'cia3', width: 8 },
      { header: 'Invigilator Sign', key: 'signature', width: 18 }
    ];

    // Set column widths
    columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });

    // Add header row
    const headerRow = worksheet.addRow(columns.map(col => col.header));
    headerRow.height = 24;
    headerRow.font = {
      bold: true,
      size: 12,
      color: { argb: '000000' }
    };
    headerRow.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };

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

    if (allocations.length === 0) {
      const noDataRow = worksheet.addRow([
        'No students allocated', '', '', '', '', '', '', '', '', '', '', ''
      ]);
      noDataRow.font = { italic: true };
      noDataRow.alignment = { horizontal: 'center' };
    } else {
      // Group allocations by room
      const allocationsByRoom: Record<string, any[]> = {};

      allocations.forEach(allocation => {
        const typedAllocation = allocation as any;
        const roomNumber = typedAllocation.room.number;

        if (!allocationsByRoom[roomNumber]) {
          allocationsByRoom[roomNumber] = [];
        }

        allocationsByRoom[roomNumber].push(typedAllocation);
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

      let rowCount = 0;

      for (const roomNumber of sortedRooms) {
        const roomAllocations = allocationsByRoom[roomNumber];

        // Sort by seat number within the room
        roomAllocations.sort((a, b) => a.seatNumber - b.seatNumber);

        // Add each allocation as a row
        roomAllocations.forEach((allocation, index) => {
          const studentRow = worksheet.addRow([
            allocation.room.number,
            allocation.seatNumber,
            allocation.student.usn,
            allocation.student.name,
            allocation.student.section,
            allocation.subject.semester,
            allocation.subject.code,
            allocation.subject.name,
            allocation.ciaMarks?.cia1 || '',
            allocation.ciaMarks?.cia2 || '',
            allocation.ciaMarks?.cia3 || '',
            '' // Empty signature cell
          ]);
          rowCount++;

          // Add alternating row colors
          if (rowCount % 2 === 0) {
            studentRow.eachCell((cell) => {
              if (cell.value !== '' || Number(cell.col) <= columns.length) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: COLORS.ALT_ROW_BG.slice(2) }
                };
              }
            });
          }

          // Make signature cell stand out
          const signatureCell = studentRow.getCell(12);
          signatureCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.SIGNATURE_BG.slice(2) }
          };

          // Add borders to every cell
          studentRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              left: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              bottom: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } },
              right: { style: 'thin', color: { argb: COLORS.BORDER.slice(2) } }
            };

            // Center alignment for most cells, left for names and USN
            if (Number(cell.col) === 3 || Number(cell.col) === 4 || Number(cell.col) === 8) {
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          });
        });
      }

      // Add summary statistics
      worksheet.addRow([]);
      const summaryRow = worksheet.addRow([
        'Summary:',
        '',
        `Total Students: ${allocations.length}`,
        `Total Rooms: ${sortedRooms.length}`,
        '',
        semester ? `Semester: ${semester}` : 'All Semesters',
        '', '', '', '', '', ''
      ]);

      summaryRow.font = { bold: true };
      summaryRow.eachCell((cell) => {
        if (Number(cell.col) <= 6) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    }

    // Add footer signature area
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Add test coordinators area
    const coordRow = worksheet.addRow([
      'Test Coordinators', '', '', '', '', '', '', '', '', '', '', 'Dean Academics & HOD-ISE'
    ]);
    coordRow.font = { bold: true };

    // Add coordinator names
    worksheet.addRow([]);
    worksheet.addRow([
      'Dr. Madhura J', '', '', '', '', '', '', '', '', '', '', 'Dr. Annapurna P Patil'
    ]);

    worksheet.addRow([
      'Prof. Bindu Bhargavi SM', '', '', '', '', '', '', '', '', '', '', ''
    ]);

    // Add footer
    worksheet.addRow([]);
    const footerRow = worksheet.addRow(['', '', '', '', '', '', '', '', '', '', '', '']);
    const footerCell = footerRow.getCell(1);
    footerCell.value = `Generated by: Duty Allocation System - ${format(new Date(), 'dd-MM-yyyy HH:mm')}`;
    footerCell.font = { italic: true, size: 10 };

    // Export the workbook to a buffer
    return await workbook.xlsx.writeBuffer();

  } catch (error) {
    console.error('Error generating student seating CIA format report:', error);
    throw error;
  }
}

/**
 * Export Student Seating Summary in CIA format (USN Range format)
 * Shows grouped USN ranges by semester and section with room assignments
 * 
 * @param semester The semester to filter students (optional - if not provided, exports all)
 * @param scheduleId Optional schedule ID to filter by specific exam schedule
 * @param assessmentNumber The CIA assessment number (1, 2, or 3) - defaults to '2'
 */
export async function exportStudentSeatingSummaryCIAFormat(semester?: number, scheduleId?: string, assessmentNumber: string = '2'): Promise<any> {
  await dbConnect();

  // Create a new workbook and worksheet
  const workbook = new Excel.Workbook();

  // Set workbook properties
  workbook.creator = 'Duty Allocation System';
  workbook.lastModifiedBy = 'API';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Student Seating Summary', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5, right: 0.5,
        top: 0.5, bottom: 0.5,
        header: 0.3, footer: 0.3
      }
    }
  });

  try {
    // Build query for student allocations
    const query: any = {};
    if (scheduleId) {
      query.schedule = scheduleId;
    }

    // Get all allocations with populated fields
    let allocations = await StudentAllocation.find(query)
      .populate('student')
      .populate('room')
      .populate('schedule')
      .populate('subject')
      .sort({ 'subject.semester': 1, 'student.section': 1, 'student.usn': 1 })
      .lean();

    // Filter by semester if specified
    if (semester) {
      allocations = allocations.filter((allocation: any) =>
        allocation.subject && allocation.subject.semester === semester
      );
    }

    console.log(`Generating student seating summary with ${allocations.length} allocations for semester: ${semester || 'all'}`);

    // Determine semester type and academic year
    let semesterType = 'Odd'; // Default
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

    if (semester) {
      semesterType = semester % 2 === 0 ? 'Even' : 'Odd';
    }

    // Add college logo
    const logoCell = worksheet.getCell('A1');
    logoCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Try to add the college logo
    try {
      const fs = require('fs');
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');

      if (fs.existsSync(logoPath)) {
        const logoImage = workbook.addImage({
          filename: logoPath,
          extension: 'png',
        });
        worksheet.addImage(logoImage, {
          tl: { col: 0, row: 0 },
          ext: { width: 80, height: 80 },
          editAs: 'oneCell'
        });
      } else {
        console.log('College logo not found at path:', logoPath);
        logoCell.value = 'LOGO';
        logoCell.font = { name: 'Arial', bold: true, size: 12 };
      }
    } catch (error) {
      console.warn('Error adding college logo, using placeholder:', error);
      logoCell.value = 'LOGO';
      logoCell.font = { name: 'Arial', bold: true, size: 12 };
    }

    // Add college header
    worksheet.mergeCells('B1:F1');
    const collegeCell = worksheet.getCell('B1');
    collegeCell.value = 'DAYANANDA SAGAR COLLEGE OF ENGINEERING';
    collegeCell.font = { name: 'Arial', bold: true, size: 14 };
    collegeCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add college address line 1
    worksheet.mergeCells('B2:F2');
    const addressCell1 = worksheet.getCell('B2');
    addressCell1.value = '(An Autonomous Institute affiliated to Visvesvaraya Technological University (VTU), Belagavi,';
    addressCell1.font = { name: 'Arial', size: 8 };
    addressCell1.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add college address line 2
    worksheet.mergeCells('B3:F3');
    const addressCell2 = worksheet.getCell('B3');
    addressCell2.value = 'Approved by AICTE and UGC, Accredited by NBA (Tier 1: 2023-2025), NAAC "A+" Certified Institution)';
    addressCell2.font = { name: 'Arial', size: 8 };
    addressCell2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add department name
    worksheet.mergeCells('A5:F5');
    const deptCell = worksheet.getCell('A5');
    deptCell.value = 'Department of Information Science and Engineering';
    deptCell.font = { name: 'Arial', bold: true, size: 12 };
    deptCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add accreditation
    worksheet.mergeCells('A6:F6');
    const accreditationCell = worksheet.getCell('A6');
    accreditationCell.value = '(Accredited by NBA Tier 1: 2025-2028)';
    accreditationCell.font = { name: 'Arial', size: 10, italic: true };
    accreditationCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add title
    worksheet.mergeCells('A8:F8');
    const titleCell = worksheet.getCell('A8');
    const semesterText = semester ? `${semester}` : 'All';
    const assessmentMap: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III' };
    const romanAssessment = assessmentMap[assessmentNumber] || assessmentNumber;
    titleCell.value = `UG Continuous Internal Assessment ${romanAssessment} (${semesterType.toUpperCase()} Sem ${academicYear})`;
    titleCell.font = { name: 'Arial', bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add subtitle
    worksheet.mergeCells('A9:F9');
    const subtitleCell = worksheet.getCell('A9');
    subtitleCell.value = `Student Seating Allotment (${semesterText}${semester ? getSuperscript(semester) : ''} Semester)`;
    subtitleCell.font = { name: 'Arial', bold: true, size: 11 };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Starting row for the table
    let currentRow = 11;

    // Set column widths
    worksheet.getColumn(1).width = 8;   // Sem
    worksheet.getColumn(2).width = 12;  // Section
    worksheet.getColumn(3).width = 35;  // USN Range
    worksheet.getColumn(4).width = 8;   // Count
    worksheet.getColumn(5).width = 12;  // Room No.

    // Add table headers
    const headerRow = worksheet.addRow(['Sem', 'Section', 'USN Range', 'Count', 'Room No.']);
    headerRow.height = 20;
    headerRow.font = { bold: true, size: 11 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Style header row
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });

    if (allocations.length === 0) {
      const noDataRow = worksheet.addRow(['', '', 'No students allocated', '', '']);
      noDataRow.font = { italic: true };
      noDataRow.getCell(3).alignment = { horizontal: 'center' };
    } else {
      // Group allocations by semester and section
      const groupedBySemesterSection: Record<string, any[]> = {};

      allocations.forEach((allocation: any) => {
        const sem = allocation.subject.semester;
        const section = allocation.student.section;
        const key = `${sem}_${section}`;

        if (!groupedBySemesterSection[key]) {
          groupedBySemesterSection[key] = [];
        }

        groupedBySemesterSection[key].push(allocation);
      });

      // Process each semester-section group
      const sortedKeys = Object.keys(groupedBySemesterSection).sort();

      for (const key of sortedKeys) {
        const [sem, section] = key.split('_');
        const sectionAllocations = groupedBySemesterSection[key];

        // Sort by USN
        sectionAllocations.sort((a, b) => a.student.usn.localeCompare(b.student.usn));

        // Group by room for this section
        const roomGroups: Record<string, any[]> = {};
        sectionAllocations.forEach(allocation => {
          const roomKey = allocation.room.number;
          if (!roomGroups[roomKey]) {
            roomGroups[roomKey] = [];
          }
          roomGroups[roomKey].push(allocation);
        });

        // Create USN ranges for each room
        const sortedRooms = Object.keys(roomGroups).sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, ''), 10);
          const numB = parseInt(b.replace(/\D/g, ''), 10);
          return numA - numB;
        });

        let isFirstRoomForSection = true;

        for (const roomNumber of sortedRooms) {
          const roomStudents = roomGroups[roomNumber];
          roomStudents.sort((a, b) => a.student.usn.localeCompare(b.student.usn));

          // Create USN range
          let usnRange = '';
          if (roomStudents.length === 1) {
            usnRange = roomStudents[0].student.usn;
          } else {
            // Group consecutive USNs
            const usnGroups = [];
            let currentGroup = [roomStudents[0]];

            for (let i = 1; i < roomStudents.length; i++) {
              const currentUSN = roomStudents[i].student.usn;
              const lastUSN = currentGroup[currentGroup.length - 1].student.usn;

              // Check if USNs are consecutive (assuming format like 1DS23IS001)
              const currentNum = parseInt(currentUSN.slice(-3));
              const lastNum = parseInt(lastUSN.slice(-3));

              if (currentNum === lastNum + 1 && currentGroup.length < 20) {
                currentGroup.push(roomStudents[i]);
              } else {
                usnGroups.push(currentGroup);
                currentGroup = [roomStudents[i]];
              }
            }
            usnGroups.push(currentGroup);

            // Format USN ranges
            const rangeStrings = usnGroups.map(group => {
              if (group.length === 1) {
                return group[0].student.usn;
              } else {
                return `${group[0].student.usn} – ${group[group.length - 1].student.usn}`;
              }
            });

            usnRange = rangeStrings.join('\n');
          }

          // Add row to table
          const dataRow = worksheet.addRow([
            isFirstRoomForSection ? sem : '', // Show semester only for first row of section
            isFirstRoomForSection ? section : '', // Show section only for first row of section
            usnRange,
            roomStudents.length,
            roomNumber
          ]);

          // Style the row
          dataRow.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };

            // Alignment
            if (colNumber === 1 || colNumber === 2) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (colNumber === 3) {
              cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            } else {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          });

          // Increase row height if there are multiple USN ranges
          if (usnRange.includes('\n')) {
            dataRow.height = 15 * (usnRange.split('\n').length);
          }

          isFirstRoomForSection = false;
        }
      }
    }

    // Add signature area
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Test Coordinators
    const coordRow = worksheet.addRow(['', '', 'Test Coordinators', '', 'Dean Academics & HoD-ISE']);
    coordRow.font = { bold: true };
    coordRow.getCell(3).alignment = { horizontal: 'left' };
    coordRow.getCell(5).alignment = { horizontal: 'right' };

    worksheet.addRow([]);

    // Names
    const nameRow1 = worksheet.addRow(['', '', '', '', 'Dr. Annapurna P.Patil']);
    nameRow1.getCell(5).alignment = { horizontal: 'right' };

    // Export the workbook to a buffer
    return await workbook.xlsx.writeBuffer();

  } catch (error) {
    console.error('Error generating student seating summary CIA format report:', error);
    throw error;
  }
}

// Helper function to get superscript text
function getSuperscript(num: number): string {
  const superscripts: Record<number, string> = {
    1: 'st', 2: 'nd', 3: 'rd', 4: 'th', 5: 'th', 6: 'th', 7: 'th', 8: 'th'
  };
  return superscripts[num] || 'th';
}

/**
 * Generate Faculty Duty Allotment Report in the format required for Dayananda Sagar College of Engineering
 * Produces a report that matches the specific CIA examination duty format
 * 
 * @param assessmentNumber The CIA assessment number (1, 2, or 3)
 */
export async function exportFacultyDutyAllotmentReport(assessmentNumber: string = '2'): Promise<any> {
  await dbConnect();

  // Create a new workbook and worksheet
  const workbook = new Excel.Workbook();

  // Set workbook properties
  workbook.creator = 'Duty Allocation System';
  workbook.lastModifiedBy = 'API';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Faculty Duty Allotment', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5, right: 0.5,
        top: 0.5, bottom: 0.5,
        header: 0.3, footer: 0.3
      }
    }
  });

  // Determine semester type based on active student semesters
  let semesterType = 'Even'; // Default to Even
  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}-${currentYear + 1}`;

  try {
    // Get all unique active semesters from subjects
    const subjects = await Subject.find().lean();
    if (subjects && subjects.length > 0) {
      // Extract unique semester numbers
      const semesters = [...new Set(subjects.map((s: any) => s.semester))];

      // Check if most semesters are even or odd
      const evenSemesters = semesters.filter(sem => sem % 2 === 0);
      const oddSemesters = semesters.filter(sem => sem % 2 !== 0);

      // Determine semester type based on which type has more active semesters
      if (oddSemesters.length > evenSemesters.length) {
        semesterType = 'Odd';
      } else {
        semesterType = 'Even';
      }

      console.log(`Detected semesters: ${semesters.join(', ')}. Semester type: ${semesterType}`);
    } else {
      // If no subjects, fall back to date-based detection
      const currentMonth = new Date().getMonth() + 1; // 1-12
      semesterType = currentMonth >= 1 && currentMonth <= 6 ? 'Even' : 'Odd';
      console.log(`No subjects found. Using date-based detection. Semester type: ${semesterType}`);
    }
  } catch (error) {
    console.error('Error determining semester type, using default:', error);
    // Fallback to date-based semester detection
    const currentMonth = new Date().getMonth() + 1; // 1-12
    semesterType = currentMonth >= 1 && currentMonth <= 6 ? 'Even' : 'Odd';
  }

  try {
    // Get all scheduled dates and shifts
    const schedules = await Schedule.find({ isActive: true })
      .sort({ date: 1, shift: 1 })
      .lean();

    if (schedules.length === 0) {
      throw new Error('No active schedules found for allocation');
    }

    // Get all duties with populated fields
    const duties = await ProfessorDuty.find()
      .populate('professor')
      .populate('room')
      .sort({ 'professor.name': 1 })
      .lean();

    console.log(`Generating faculty duty report with ${duties.length} duty allocations`);

    // Create a map of professor duties by date and shift
    const dutyMap = new Map();

    duties.forEach((duty: any) => {
      if (!duty.professor) return;

      const profName = duty.professor.name;
      // Get just initials from the professor name
      const initials = profName
        .split(' ')
        .map((name: string) => name.charAt(0))
        .join('');

      const dateStr = format(new Date(duty.date), 'dd/MM/yyyy');
      const shift = duty.shift;
      const key = `${initials}`;

      if (!dutyMap.has(key)) {
        dutyMap.set(key, { professor: profName, initials, duties: new Map() });
      }

      const profRecord = dutyMap.get(key);
      if (!profRecord.duties.has(`${dateStr}_${shift}`)) {
        profRecord.duties.set(`${dateStr}_${shift}`, true);
      }
    });

    // Group schedules by date
    const scheduleDates = new Map();
    schedules.forEach((schedule: any) => {
      const dateStr = format(new Date(schedule.date), 'dd/MM/yyyy');
      if (!scheduleDates.has(dateStr)) {
        scheduleDates.set(dateStr, []);
      }
      scheduleDates.get(dateStr).push(schedule);
    });

    // Create array of unique dates
    const dates = Array.from(scheduleDates.keys());

    // Set column widths
    worksheet.getColumn(1).width = 12; // Staff name column

    // Layout the report

    // Add the college logo (insert a placeholder cell for the logo)
    const logoCell = worksheet.getCell('A1');
    logoCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Try to add the college logo if it exists - use a more resilient approach
    try {
      const fs = require('fs');
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');

      // Check if file exists before trying to add it
      if (fs.existsSync(logoPath)) {
        const logoImage = workbook.addImage({
          filename: logoPath,
          extension: 'png',
        });
        worksheet.addImage(logoImage, {
          tl: { col: 0, row: 0 },
          ext: { width: 80, height: 80 },
          editAs: 'oneCell'
        });
      } else {
        console.log('College logo not found at path:', logoPath);
        // Use a placeholder text instead
        logoCell.value = 'LOGO';
        logoCell.font = {
          name: 'Arial',
          bold: true,
          size: 12,
        };
      }
    } catch (error) {
      console.warn('Error adding college logo, using placeholder:', error);
      // Use a placeholder cell
      logoCell.value = 'LOGO';
      logoCell.font = {
        name: 'Arial',
        bold: true,
        size: 12,
      };
    }

    // Add college name header
    worksheet.mergeCells('B1:J1');
    const collegeCell = worksheet.getCell('B1');
    collegeCell.value = 'DAYANANDA SAGAR COLLEGE OF ENGINEERING';
    collegeCell.font = {
      name: 'Arial',
      bold: true,
      size: 14,
    };
    collegeCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add college address
    worksheet.mergeCells('B2:J2');
    const addressCell = worksheet.getCell('B2');
    addressCell.value = '(An Autonomous Institute affiliated to Visvesvaraya Technological University (VTU), Belagavi,';
    addressCell.font = {
      name: 'Arial',
      size: 8,
    };
    addressCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    worksheet.mergeCells('B3:J3');
    const address2Cell = worksheet.getCell('B3');
    address2Cell.value = 'Approved by AICTE and UGC, Accredited by NBA (Tier 1: 2023-2025), NAAC "A+" Certified Institution)';
    address2Cell.font = {
      name: 'Arial',
      size: 8,
    };
    address2Cell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    worksheet.mergeCells('B4:J4');
    const address3Cell = worksheet.getCell('B4');
    address3Cell.value = 'Shavige Malleshwara Hills, Kumaraswamy Layout, Bengaluru - 560 111, India';
    address3Cell.font = {
      name: 'Arial',
      size: 8,
    };
    address3Cell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add department name
    worksheet.mergeCells('A6:J6');
    const deptCell = worksheet.getCell('A6');
    deptCell.value = 'Department of Information Science and Engineering';
    deptCell.font = {
      name: 'Arial',
      bold: true,
      size: 12,
    };
    deptCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add accreditation line
    worksheet.mergeCells('A7:J7');
    const accreditationCell = worksheet.getCell('A7');
    accreditationCell.value = '(Accredited by NBA Tier 1: 2022-2025)';
    accreditationCell.font = {
      name: 'Arial',
      size: 10,
      italic: true
    };
    accreditationCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add date
    worksheet.mergeCells('H8:J8');
    const dateCell = worksheet.getCell('H8');
    dateCell.value = `Date: ${format(new Date(), 'dd/MM/yyyy')}`;
    dateCell.font = {
      name: 'Arial',
      size: 10,
    };
    dateCell.alignment = {
      horizontal: 'right',
      vertical: 'middle'
    };

    // Add title
    worksheet.mergeCells('A9:J9');
    const titleCell = worksheet.getCell('A9');
    titleCell.value = `Continuous Internal Assessment - ${assessmentNumber}`;
    titleCell.font = {
      name: 'Arial',
      bold: true,
      underline: true,
      size: 12,
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Add subtitle
    worksheet.mergeCells('A10:J10');
    const subtitleCell = worksheet.getCell('A10');
    subtitleCell.value = `Faculty Duty Allotment - ${semesterType} Semester - ${academicYear}`;
    subtitleCell.font = {
      name: 'Arial',
      bold: true,
      size: 12,
    };
    subtitleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Starting row for the sessions
    let currentRow = 12;

    // Create session headers (first row)
    worksheet.getCell(`A${currentRow}`).value = 'Session';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`A${currentRow}`).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Add date columns
    let colIndex = 2; // Start from column B
    dates.forEach(date => {
      const dateObj = new Date(date.split('/').reverse().join('-'));
      const formattedDate = format(dateObj, 'dd/MM/yyyy');

      // Merge cells for the date
      worksheet.mergeCells(`${columnToLetter(colIndex)}${currentRow}:${columnToLetter(colIndex + 1)}${currentRow}`);

      // Add date header
      const dateCell = worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`);
      dateCell.value = formattedDate;
      dateCell.font = { bold: true };
      dateCell.alignment = { horizontal: 'center' };
      dateCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Move to next date columns
      colIndex += 2;
    });

    // Create session time row
    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = '';
    worksheet.getCell(`A${currentRow}`).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Add session time headers
    colIndex = 2; // Start from column B
    dates.forEach(date => {
      // S1 column (Morning)
      worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).value = '9.30-11.00';
      worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).font = { bold: true };
      worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // S2 column (Afternoon)
      worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).value = '2.00-3.30';
      worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).font = { bold: true };
      worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Move to next date columns
      colIndex += 2;
    });

    // Create shift labels row
    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = 'Staff name';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`A${currentRow}`).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Add shift labels
    colIndex = 2; // Start from column B
    dates.forEach(date => {
      // S1 column (Morning)
      worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).value = 'S1';
      worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).font = { bold: true };
      worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // S2 column (Afternoon)
      worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).value = 'S2';
      worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).font = { bold: true };
      worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Move to next date columns
      colIndex += 2;
    });

    // Add professor rows
    const professors = Array.from(dutyMap.values());

    professors.forEach(prof => {
      currentRow++;

      // Add professor initials
      worksheet.getCell(`A${currentRow}`).value = prof.initials;
      worksheet.getCell(`A${currentRow}`).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Fill duty cells
      colIndex = 2; // Start from column B
      dates.forEach(date => {
        // Morning session (S1)
        worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).value =
          prof.duties.has(`${date}_Morning`) ? '*' : '';
        worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).alignment = { horizontal: 'center' };
        worksheet.getCell(`${columnToLetter(colIndex)}${currentRow}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Afternoon session (S2)
        worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).value =
          prof.duties.has(`${date}_Afternoon`) ? '*' : '';
        worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).alignment = { horizontal: 'center' };
        worksheet.getCell(`${columnToLetter(colIndex + 1)}${currentRow}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Move to next date columns
        colIndex += 2;
      });
    });

    // Add extra signature area rows
    currentRow += 3;

    // Add test coordinators area
    worksheet.getCell(`A${currentRow}`).value = 'Test Coordinators';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };

    // Dean signature area
    worksheet.getCell(`H${currentRow}`).value = 'Dean Academics & HOD-ISE';
    worksheet.getCell(`H${currentRow}`).font = { bold: true };

    // Add name placeholders for coordinators
    currentRow += 2;
    worksheet.getCell(`A${currentRow}`).value = 'Dr. Madhura J';

    currentRow += 1;
    worksheet.getCell(`A${currentRow}`).value = 'Prof. Bindu Bhargavi SM';

    // Add name for HOD/Dean
    currentRow += -3;
    worksheet.getCell(`H${currentRow}`).value = 'Dean Academics & HOD-ISE';

    currentRow += 1;
    worksheet.getCell(`H${currentRow}`).value = 'Dr. Annapurna P Patil';



    // Export the workbook to a buffer
    return await workbook.xlsx.writeBuffer();

  } catch (error) {
    console.error('Error generating faculty duty allotment report:', error);
    throw error;
  }
} 