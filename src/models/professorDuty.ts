import mongoose from 'mongoose';
import { Types } from 'mongoose';

export interface IProfessorDuty {
  professor: Types.ObjectId;
  room: Types.ObjectId;
  date: Date;
  shift: 'Morning' | 'Afternoon' | 'Evening';
  startTime?: string;
  endTime?: string;
}

// Try to delete the model first to recreate it
try {
  if (mongoose.models && mongoose.models.ProfessorDuty) {
    delete mongoose.models.ProfessorDuty;
  }
} catch (error) {
  console.error('Error deleting model:', error);
}

// Create a completely fresh schema
const ProfessorDutySchema = new mongoose.Schema<IProfessorDuty>({
  professor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Professor', 
    required: true 
  },
  room: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  shift: { 
    type: String, 
    required: true,
    enum: ['Morning', 'Afternoon', 'Evening']
  },
  startTime: { 
    type: String 
  },
  endTime: { 
    type: String 
  }
}, { 
  timestamps: true,
  strict: false  // Allow extra fields to be stored temporarily
});

// Add unique compound index to prevent duplicate assignments
ProfessorDutySchema.index({ professor: 1, date: 1, shift: 1 }, { unique: true });
ProfessorDutySchema.index({ room: 1, date: 1, shift: 1 }, { unique: true });

// Create the model directly
const ProfessorDuty = mongoose.models.ProfessorDuty || 
  mongoose.model<IProfessorDuty>('ProfessorDuty', ProfessorDutySchema);

export default ProfessorDuty; 