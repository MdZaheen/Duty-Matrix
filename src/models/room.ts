import mongoose from 'mongoose';

export interface IRoom {
  number: string;
  capacity: number;
  building?: string;
  floor?: number;
  isActive: boolean;
}

const RoomSchema = new mongoose.Schema<IRoom>({
  number: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true },
  building: { type: String },
  floor: { type: Number },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Add index for query optimization
// Don't add duplicate index for number since it's already unique: true above
RoomSchema.index({ capacity: -1 });

// Check if the model already exists to prevent overwriting during hot reloads
const Room = mongoose.models.Room as mongoose.Model<IRoom> || 
  mongoose.model<IRoom>('Room', RoomSchema);

export default Room; 