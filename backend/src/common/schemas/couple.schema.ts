import { HydratedDocument, Schema, Types } from 'mongoose';
import { User } from './user.schema';

export type CoupleDocument = HydratedDocument<Couple>;

export class Couple {
  userAId!: Types.ObjectId;

  userBId!: Types.ObjectId;

  inviteCode!: string;

  requestedByUserId!: Types.ObjectId;

  targetUserId!: Types.ObjectId;

  status!: 'pending' | 'accepted' | 'rejected' | 'cancelled';

  expiresAt!: Date;
}

export const CoupleSchema = new Schema<Couple>(
  {
    userAId: { type: Types.ObjectId, ref: User.name, required: true },
    userBId: { type: Types.ObjectId, ref: User.name, required: true },
    inviteCode: { type: String, required: true, unique: true },
    requestedByUserId: { type: Types.ObjectId, ref: User.name, required: true },
    targetUserId: { type: Types.ObjectId, ref: User.name, required: true },
    status: { type: String, default: 'pending' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
