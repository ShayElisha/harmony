import { Prop, Schema } from '@nestjs/mongoose/dist/decorators';
import { SchemaFactory } from '@nestjs/mongoose/dist/factories';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema';

export type NotificationSettingDocument = HydratedDocument<NotificationSetting>;

@Schema({ timestamps: true })
export class NotificationSetting {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ default: true })
  smartAlerts!: boolean;

  @Prop({ default: true })
  predictionAlerts!: boolean;

  @Prop({ default: true })
  humorAlerts!: boolean;
}

export const NotificationSettingSchema =
  SchemaFactory.createForClass(NotificationSetting);
