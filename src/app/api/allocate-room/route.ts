import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Room from '@/models/room';
import RoomAllocation from '@/models/roomAllocation';
import Student from '@/models/student';
import StudentAllocation from '@/models/studentAllocation';
import Subject from '@/models/subject';
import { Types } from 'mongoose';

// Hardcoded room order and capacities as per user image
const ROOM_ORDER = [
  { number: '009', capacity: 40 },
  { number: '103', capacity: 35 },
  { number: '107', capacity: 30 },
  { number: '205', capacity: 40 },
  { number: '206', capacity: 25 },
  { number: '208', capacity: 32 },
  { number: '209', capacity: 32 },
  { number: '308', capacity: 30 },
  { number: '401', capacity: 35 },
  { number: '409', capacity: 35 },
  { number: '511', capacity: 40 },
  { number: '512', capacity: 40 },
];

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { examDate, examTime, scheduleId, subject1, subject2 } = body;
    if (!examDate || !examTime || !scheduleId || (!subject1 && !subject2)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Clear previous allocations for this schedule and subject(s)
    const deleteQuery: any = { schedule: scheduleId };
    if (subject1 && subject2) {
      deleteQuery['subject'] = { $in: [subject1, subject2] };
    } else if (subject1) {
      deleteQuery['subject'] = subject1;
    } else if (subject2) {
      deleteQuery['subject'] = subject2;
    }
    await StudentAllocation.deleteMany(deleteQuery);

    // Get subject and semester info
    let sem1 = null, sem2 = null;
    if (subject1) {
      const subj1 = await Subject.findById(subject1);
      if (!subj1) return NextResponse.json({ error: 'Invalid subject for first group' }, { status: 400 });
      sem1 = subj1.semester;
    }
    if (subject2) {
      const subj2 = await Subject.findById(subject2);
      if (!subj2) return NextResponse.json({ error: 'Invalid subject for second group' }, { status: 400 });
      sem2 = subj2.semester;
    }

    // Fetch students for selected semesters only and sort by USN
    let queue1 = subject1 ? await Student.find({ semester: sem1 }).sort({ usn: 1 }) : [];
    let queue2 = subject2 ? await Student.find({ semester: sem2 }).sort({ usn: 1 }) : [];

    let totalAllocated = 0;
    let roomAllocations = [];

    // Shuffle room order
    const shuffledRooms = shuffleArray(ROOM_ORDER);

    for (const roomInfo of shuffledRooms) {
      if (queue1.length === 0 && queue2.length === 0) break;
      const room = await Room.findOne({ number: roomInfo.number });
      if (!room) continue;
      await StudentAllocation.deleteMany({ room: room._id, schedule: scheduleId });
      let finalCap1 = 0, finalCap2 = 0;
      if (subject1 && subject2 && queue1.length > 0 && queue2.length > 0) {
        // Split capacity between both groups
        finalCap1 = Math.floor(roomInfo.capacity / 2);
        finalCap2 = roomInfo.capacity - finalCap1;
      } else if (queue1.length > 0) {
        // All seats to first group
        finalCap1 = Math.min(roomInfo.capacity, queue1.length);
        finalCap2 = 0;
      } else if (queue2.length > 0) {
        // All seats to second group
        finalCap1 = 0;
        finalCap2 = Math.min(roomInfo.capacity, queue2.length);
      }
      const studentsFor1 = queue1.splice(0, finalCap1);
      const studentsFor2 = queue2.splice(0, finalCap2);
      // Assign seat numbers
      studentsFor1.forEach((student, idx) => (student._seatNumber = idx + 1));
      studentsFor2.forEach((student, idx) => (student._seatNumber = finalCap1 + idx + 1));
      const examAllocations = [];
      if (studentsFor1.length > 0) {
        examAllocations.push({
          semester: sem1,
          subject: new Types.ObjectId(subject1),
          studentCount: studentsFor1.length,
          allocatedStudents: studentsFor1.map(s => s._id)
        });
        await StudentAllocation.insertMany(studentsFor1.map((student) => ({
          student: student._id,
          room: room._id,
          schedule: scheduleId,
          subject: subject1,
          seatNumber: student._seatNumber,
        })));
      }
      if (studentsFor2.length > 0) {
        examAllocations.push({
          semester: sem2,
          subject: new Types.ObjectId(subject2),
          studentCount: studentsFor2.length,
          allocatedStudents: studentsFor2.map(s => s._id)
        });
        await StudentAllocation.insertMany(studentsFor2.map((student) => ({
          student: student._id,
          room: room._id,
          schedule: scheduleId,
          subject: subject2,
          seatNumber: student._seatNumber,
        })));
      }
      if (examAllocations.length > 0) {
        const roomAllocation = new RoomAllocation({
          room: room._id,
          examDate: new Date(examDate),
          examTime,
          examAllocations,
          totalAllocatedStudents: studentsFor1.length + studentsFor2.length,
          status: 'pending',
          schedule: scheduleId
        });
        await roomAllocation.save();
        roomAllocations.push({
          room: room.number,
          students1: studentsFor1.length,
          students2: studentsFor2.length,
          total: studentsFor1.length + studentsFor2.length
        });
        totalAllocated += studentsFor1.length + studentsFor2.length;
      }
    }
    return NextResponse.json({
      message: 'Rooms allocated successfully',
      examDate,
      examTime,
      roomAllocations,
      totalAllocatedStudents: totalAllocated,
      roomsUsed: roomAllocations.length
    });
  } catch (error: any) {
    console.error('Error allocating rooms:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 