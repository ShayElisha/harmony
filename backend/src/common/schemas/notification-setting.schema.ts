import { HydratedDocument, Schema, Types } from 'mongoose';
import { User } from './user.schema';

export type NotificationSettingDocument = HydratedDocument<NotificationSetting>;

export class NotificationSetting {
  userId!: Types.ObjectId;

  smartAlerts!: boolean;

  predictionAlerts!: boolean;

  humorAlerts!: boolean;
}

export const NotificationSettingSchema = new Schema<NotificationSetting>(
  {
    userId: { type: Types.ObjectId, ref: User.name, required: true, unique: true },
    smartAlerts: { type: Boolean, default: true },
    predictionAlerts: { type: Boolean, default: true },
    humorAlerts: { type: Boolean, default: true },
  },
  { timestamps: true },
);
