import { Prop, Schema } from '@nestjs/mongoose/dist/decorators';
import { SchemaFactory } from '@nestjs/mongoose/dist/factories';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema';

export type MoodEntryDocument = HydratedDocument<MoodEntry>;

@Schema({ timestamps: true })
export class MoodEntry {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 10 })
  irritability!: number;

  @Prop({ required: true, min: 1, max: 10 })
  fatigue!: number;

  @Prop()
  note?: string;
}

export const MoodEntrySchema = SchemaFactory.createForClass(MoodEntry);
