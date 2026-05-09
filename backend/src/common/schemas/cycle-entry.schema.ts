import { HydratedDocument, Schema, Types } from 'mongoose';
import { User } from './user.schema';

export type CycleEntryDocument = HydratedDocument<CycleEntry>;

export class CycleEntry {
  userId!: Types.ObjectId;

  startDate!: string;

  endDate?: string;

  symptoms!: string[];

  energyLevel?: number;
}

export const CycleEntrySchema = new Schema<CycleEntry>(
  {
    userId: { type: Types.ObjectId, ref: User.name, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String },
    symptoms: { type: [String], default: [] },
    energyLevel: { type: Number, min: 1, max: 10 },
  },
  { timestamps: true },
);
