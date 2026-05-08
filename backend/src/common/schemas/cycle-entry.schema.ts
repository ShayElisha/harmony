import { Prop, Schema } from '@nestjs/mongoose/dist/decorators';
import { SchemaFactory } from '@nestjs/mongoose/dist/factories';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema';

export type CycleEntryDocument = HydratedDocument<CycleEntry>;

@Schema({ timestamps: true })
export class CycleEntry {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  startDate!: string;

  @Prop()
  endDate?: string;

  @Prop({ default: [] })
  symptoms!: string[];

  @Prop({ min: 1, max: 10 })
  energyLevel?: number;
}

export const CycleEntrySchema = SchemaFactory.createForClass(CycleEntry);
