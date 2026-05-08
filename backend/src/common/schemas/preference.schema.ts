import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema';

export type PreferenceDocument = HydratedDocument<Preference>;

@Schema({ timestamps: true })
export class Preference {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ default: '' })
  helpfulActions!: string;

  @Prop({ default: '' })
  avoidActions!: string;

  @Prop({ default: true })
  shareMood!: boolean;

  @Prop({ default: false })
  shareCycle!: boolean;

  @Prop({ default: '' })
  importantTiming!: string;
}

export const PreferenceSchema = SchemaFactory.createForClass(Preference);
