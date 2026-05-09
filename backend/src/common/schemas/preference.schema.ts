import { HydratedDocument, Schema, Types } from 'mongoose';
import { User } from './user.schema';

export type PreferenceDocument = HydratedDocument<Preference>;

export class Preference {
  userId!: Types.ObjectId;

  helpfulActions!: string;

  avoidActions!: string;

  shareMood!: boolean;

  shareCycle!: boolean;

  importantTiming!: string;
}

export const PreferenceSchema = new Schema<Preference>(
  {
    userId: { type: Types.ObjectId, ref: User.name, required: true, unique: true },
    helpfulActions: { type: String, default: '' },
    avoidActions: { type: String, default: '' },
    shareMood: { type: Boolean, default: true },
    shareCycle: { type: Boolean, default: false },
    importantTiming: { type: String, default: '' },
  },
  { timestamps: true },
);
