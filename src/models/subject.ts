import mongoose from 'mongoose';

export interface ISubject {
  code: string;
  name: string;
  semester: number;
  branch: string;
  credits?: number;
}

const SubjectSchema = new mongoose.Schema<ISubject>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  semester: { type: Number, required: true },
  branch: { type: String, required: true },
  credits: { type: Number }
}, { timestamps: true });

// Add indexes for query optimization
SubjectSchema.index({ semester: 1, branch: 1 });

export default mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema); 