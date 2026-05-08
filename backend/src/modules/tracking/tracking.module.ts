import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Couple, CoupleSchema } from '../../common/schemas/couple.schema';
import { CycleEntry, CycleEntrySchema } from '../../common/schemas/cycle-entry.schema';
import { Goal, GoalSchema } from '../../common/schemas/goal.schema';
import { MoodEntry, MoodEntrySchema } from '../../common/schemas/mood-entry.schema';
import {
  NotificationSetting,
  NotificationSettingSchema,
} from '../../common/schemas/notification-setting.schema';
import { Preference, PreferenceSchema } from '../../common/schemas/preference.schema';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MoodEntry.name, schema: MoodEntrySchema },
      { name: CycleEntry.name, schema: CycleEntrySchema },
      { name: Preference.name, schema: PreferenceSchema },
      { name: Goal.name, schema: GoalSchema },
      { name: NotificationSetting.name, schema: NotificationSettingSchema },
      { name: Couple.name, schema: CoupleSchema },
    ]),
  ],
  controllers: [TrackingController],
  providers: [TrackingService],
})
export class TrackingModule {}
