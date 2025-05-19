import mongoose from 'mongoose';

export interface IProfessor {
  name: string;
  designation: 'Professor' | 'Associate Professor' | 'Assistant Professor';
  email: string;
  department?: string;
  dutyCount?: number;
}

const ProfessorSchema = new mongoose.Schema<IProfessor>({
  name: { type: String, required: true },
  designation: { 
    type: String, 
    required: true,
    enum: ['Professor', 'Associate Professor', 'Assistant Professor']
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true,
    // Validate email format
    validate: {
      validator: function(v: string) {
        return /\S+@\S+\.\S+/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  department: { type: String },
  dutyCount: { type: Number, default: 0 }
}, { timestamps: true });

// Add index for query optimization
ProfessorSchema.index({ designation: 1, name: 1 });

// Add case-insensitive unique index for email
ProfessorSchema.index(
  { email: 1 }, 
  { 
    unique: true,
    collation: { locale: 'en', strength: 2 } // Case-insensitive
  }
);

// Check if the model already exists to prevent overwriting during hot reloads
const Professor = mongoose.models.Professor as mongoose.Model<IProfessor> || 
  mongoose.model<IProfessor>('Professor', ProfessorSchema);

export default Professor; 