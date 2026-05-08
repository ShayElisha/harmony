import { Prop, Schema } from '@nestjs/mongoose/dist/decorators';
import { SchemaFactory } from '@nestjs/mongoose/dist/factories';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema';

export type AiLogDocument = HydratedDocument<AiLog>;

@Schema({ timestamps: true })
export class AiLog {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  mode!: 'translate' | 'emergency';

  @Prop({ required: true })
  prompt!: string;

  @Prop({ required: true })
  response!: string;
}

export const AiLogSchema = SchemaFactory.createForClass(AiLog);
