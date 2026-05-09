import { HydratedDocument, Schema, Types } from 'mongoose';
import { User } from './user.schema';

export type MoodEntryDocument = HydratedDocument<MoodEntry>;

export class MoodEntry {
  userId!: Types.ObjectId;

  irritability!: number;

  fatigue!: number;

  note?: string;
}

export const MoodEntrySchema = new Schema<MoodEntry>(
  {
    userId: { type: Types.ObjectId, ref: User.name, required: true },
    irritability: { type: Number, required: true, min: 1, max: 10 },
    fatigue: { type: Number, required: true, min: 1, max: 10 },
    note: { type: String },
  },
  { timestamps: true },
);
