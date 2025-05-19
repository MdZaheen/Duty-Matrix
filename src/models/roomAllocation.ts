import mongoose from 'mongoose';
import { Types } from 'mongoose';

export interface IExamAllocation {
  semester: number;
  subject: Types.ObjectId;
  studentCount: number;
  allocatedStudents: Types.ObjectId[];
}

export interface IRoomAllocation {
  room: Types.ObjectId;
  examDate: Date;
  examTime: string;
  examAllocations: IExamAllocation[];
  totalAllocatedStudents: number;
  status: 'pending' | 'completed' | 'cancelled';
}

const ExamAllocationSchema = new mongoose.Schema<IExamAllocation>({
  semester: { type: Number, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  studentCount: { type: Number, required: true },
  allocatedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

const RoomAllocationSchema = new mongoose.Schema<IRoomAllocation>({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  examDate: { type: Date, required: true },
  examTime: { type: String, required: true },
  examAllocations: [ExamAllocationSchema],
  totalAllocatedStudents: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

// Add indexes for query optimization
RoomAllocationSchema.index({ room: 1, examDate: 1, examTime: 1 });
RoomAllocationSchema.index({ status: 1 });

// Check if the model already exists to prevent overwriting during hot reloads
const RoomAllocation = mongoose.models.RoomAllocation as mongoose.Model<IRoomAllocation> || 
  mongoose.model<IRoomAllocation>('RoomAllocation', RoomAllocationSchema);

export default RoomAllocation; 