import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Couple, CoupleDocument } from '../../common/schemas/couple.schema';
import { CycleEntry, CycleEntryDocument } from '../../common/schemas/cycle-entry.schema';
import { Goal, GoalDocument } from '../../common/schemas/goal.schema';
import { MoodEntry, MoodEntryDocument } from '../../common/schemas/mood-entry.schema';
import {
  NotificationSetting,
  NotificationSettingDocument,
} from '../../common/schemas/notification-setting.schema';
import { Preference, PreferenceDocument } from '../../common/schemas/preference.schema';

@Injectable()
export class TrackingService {
  constructor(
    @InjectModel(MoodEntry.name) private readonly moodEntryModel: Model<MoodEntryDocument>,
    @InjectModel(CycleEntry.name) private readonly cycleEntryModel: Model<CycleEntryDocument>,
    @InjectModel(Preference.name) private readonly preferenceModel: Model<PreferenceDocument>,
    @InjectModel(Goal.name) private readonly goalModel: Model<GoalDocument>,
    @InjectModel(NotificationSetting.name)
    private readonly notificationSettingModel: Model<NotificationSettingDocument>,
    @InjectModel(Couple.name) private readonly coupleModel: Model<CoupleDocument>,
  ) {}

  async createMood(
    userId: string,
    irritability: number,
    fatigue: number,
    note?: string,
  ) {
    const entry = await this.moodEntryModel.create({
      userId: new Types.ObjectId(userId),
      irritability,
      fatigue,
      note,
    });

    return {
      message: 'Mood entry stored',
      riskHint: irritability + fatigue > 14 ? 'yellow' : 'green',
      entryId: entry.id,
      createdAt: entry.get('createdAt'),
    };
  }

  async getRecent(userId: string) {
    const entries = await this.moodEntryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return { entries };
  }

  async createCycle(
    userId: string,
    userRole: CurrentUser['role'],
    startDate: string,
    endDate?: string,
    symptoms: string[] = [],
    energyLevel?: number,
  ) {
    if (userRole !== 'female') {
      throw new ForbiddenException('Only female users can create cycle entries');
    }

    const entry = await this.cycleEntryModel.create({
      userId: new Types.ObjectId(userId),
      startDate,
      endDate,
      symptoms,
      energyLevel,
    });
    return { message: 'Cycle entry stored', entryId: entry.id };
  }

  async getCycles(userId: string) {
    const entries = await this.cycleEntryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return { entries };
  }

  async getVisibleCycles(viewerId: string, viewerRole: CurrentUser['role']) {
    if (viewerRole === 'female') {
      return this.getCycles(viewerId);
    }

    if (viewerRole === 'male') {
      const viewerObjectId = new Types.ObjectId(viewerId);
      const couple = await this.coupleModel
        .findOne({
          status: 'accepted',
          $or: [{ userAId: viewerObjectId }, { userBId: viewerObjectId }],
        })
        .lean();

      if (!couple) {
        return { entries: [] };
      }

      const partnerId =
        String(couple.userAId) === viewerId ? String(couple.userBId) : String(couple.userAId);
      return this.getCycles(partnerId);
    }

    return this.getCycles(viewerId);
  }

  async upsertPreferences(
    userId: string,
    helpfulActions: string,
    avoidActions: string,
    shareMood: boolean,
    shareCycle: boolean,
    importantTiming: string,
  ) {
    const doc = await this.preferenceModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { helpfulActions, avoidActions, shareMood, shareCycle, importantTiming },
      { new: true, upsert: true },
    );
    return { message: 'Preferences saved', preferences: doc };
  }

  async getPreferences(userId: string) {
    const preferences = await this.preferenceModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();
    return { preferences };
  }

  async deletePreferences(userId: string) {
    await this.preferenceModel.deleteOne({ userId: new Types.ObjectId(userId) });
    return { message: 'Preferences deleted' };
  }

  async createGoal(userId: string, title: string) {
    const goal = await this.goalModel.create({
      userId: new Types.ObjectId(userId),
      title,
      status: 'active',
    });
    return { message: 'Goal saved', goalId: goal.id };
  }

  async getGoals(userId: string) {
    const goals = await this.goalModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
    return { goals };
  }

  async upsertNotifications(
    userId: string,
    smartAlerts: boolean,
    predictionAlerts: boolean,
    humorAlerts: boolean,
  ) {
    const settings = await this.notificationSettingModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { smartAlerts, predictionAlerts, humorAlerts },
      { upsert: true, new: true },
    );
    return { message: 'Notification settings saved', settings };
  }

  async getNotifications(userId: string) {
    const settings = await this.notificationSettingModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();
    return { settings };
  }
}
