import { HydratedDocument, Schema, Types } from 'mongoose';
import { User } from './user.schema';

export type AiLogDocument = HydratedDocument<AiLog>;

export class AiLog {
  userId!: Types.ObjectId;

  mode!: 'translate' | 'emergency';

  prompt!: string;

  response!: string;
}

export const AiLogSchema = new Schema<AiLog>(
  {
    userId: { type: Types.ObjectId, ref: User.name, required: true },
    mode: { type: String, required: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
  },
  { timestamps: true },
);
