import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema';

export type GoalDocument = HydratedDocument<Goal>;

@Schema({ timestamps: true })
export class Goal {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: 'active' })
  status!: 'active' | 'completed';
}

export const GoalSchema = SchemaFactory.createForClass(Goal);
