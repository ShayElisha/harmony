import { HydratedDocument, Schema, Types } from 'mongoose';
import { User } from './user.schema';

export type GoalDocument = HydratedDocument<Goal>;

export class Goal {
  userId!: Types.ObjectId;

  title!: string;

  status!: 'active' | 'completed';
}

export const GoalSchema = new Schema<Goal>(
  {
    userId: { type: Types.ObjectId, ref: User.name, required: true },
    title: { type: String, required: true },
    status: { type: String, default: 'active' },
  },
  { timestamps: true },
);
