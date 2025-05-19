import mongoose from 'mongoose';
import { Types } from 'mongoose';

export interface IStudentAllocation {
  student: Types.ObjectId;
  room: Types.ObjectId;
  schedule: Types.ObjectId;
  subject: Types.ObjectId;
  seatNumber?: number;
  attendance?: boolean;
  ciaMarks?: {
    cia1?: number;
    cia2?: number;
    cia3?: number;
  };
}

const StudentAllocationSchema = new mongoose.Schema<IStudentAllocation>({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  seatNumber: { type: Number },
  attendance: { type: Boolean, default: false },
  ciaMarks: {
    cia1: { type: Number },
    cia2: { type: Number },
    cia3: { type: Number }
  }
}, { timestamps: true });

// Add unique compound index to prevent duplicate allocations
StudentAllocationSchema.index({ student: 1, schedule: 1, subject: 1 }, { unique: true });
StudentAllocationSchema.index({ room: 1, seatNumber: 1, schedule: 1 }, { unique: true });

export default mongoose.models.StudentAllocation || mongoose.model<IStudentAllocation>('StudentAllocation', StudentAllocationSchema); 