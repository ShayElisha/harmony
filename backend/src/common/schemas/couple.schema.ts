import { Prop, Schema } from '@nestjs/mongoose/dist/decorators';
import { SchemaFactory } from '@nestjs/mongoose/dist/factories';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema';

export type CoupleDocument = HydratedDocument<Couple>;

@Schema({ timestamps: true })
export class Couple {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userAId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userBId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  inviteCode!: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  requestedByUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  targetUserId!: Types.ObjectId;

  @Prop({ default: 'pending' })
  status!: 'pending' | 'accepted' | 'rejected' | 'cancelled';

  @Prop({ required: true })
  expiresAt!: Date;
}

export const CoupleSchema = SchemaFactory.createForClass(Couple);
