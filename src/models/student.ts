import mongoose from 'mongoose';

export interface IStudent {
  name: string;
  usn: string;
  branch: string;
  section: string;
  semester: number;
  email?: string;
}

const StudentSchema = new mongoose.Schema<IStudent>({
  name: { type: String, required: true },
  usn: { type: String, required: true, unique: true },
  branch: { type: String, required: true },
  section: { type: String, required: true },
  semester: { type: Number, required: true },
  email: { type: String }
}, { timestamps: true });

// Add indexes for query optimization
StudentSchema.index({ section: 1, usn: 1 });
StudentSchema.index({ branch: 1, semester: 1 });

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema); 