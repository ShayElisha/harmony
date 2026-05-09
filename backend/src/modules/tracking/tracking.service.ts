import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(TrackingService.name);

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
    this.logger.log(
      `[createCycle] userId=${userId} role=${userRole} startDate=${startDate} endDate=${endDate ?? '-'} symptomsCount=${symptoms.length}`,
    );
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
    this.logger.log(`[createCycle] stored entryId=${entry.id} userId=${userId}`);
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
    this.logger.log(`[getVisibleCycles] viewerId=${viewerId} role=${viewerRole}`);
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
        this.logger.log(`[getVisibleCycles] no accepted couple found for viewerId=${viewerId}`);
        return { entries: [] };
      }

      const partnerId =
        String(couple.userAId) === viewerId ? String(couple.userBId) : String(couple.userAId);
      this.logger.log(`[getVisibleCycles] resolved partnerId=${partnerId} for viewerId=${viewerId}`);
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
    this.logger.log(
      `[upsertPreferences] userId=${userId} helpfulLen=${helpfulActions.length} avoidLen=${avoidActions.length} timingLen=${importantTiming.length}`,
    );
    const doc = await this.preferenceModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { helpfulActions, avoidActions, shareMood, shareCycle, importantTiming },
      { new: true, upsert: true },
    );
    this.logger.log(`[upsertPreferences] stored preferenceId=${doc?.id ?? 'unknown'} userId=${userId}`);
    return { message: 'Preferences saved', preferences: doc };
  }

  async getPreferences(userId: string) {
    this.logger.log(`[getPreferences] userId=${userId}`);
    const preferences = await this.preferenceModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();
    this.logger.log(
      `[getPreferences] userId=${userId} found=${preferences ? 'yes' : 'no'} preferenceId=${preferences?._id ?? '-'}`,
    );
    return { preferences };
  }

  async deletePreferences(userId: string) {
    await this.preferenceModel.deleteOne({ userId: new Types.ObjectId(userId) });
    return { message: 'Preferences deleted' };
  }

  async createGoal(userId: string, title: string) {
    this.logger.log(`[createGoal] userId=${userId} titleLen=${title.length}`);
    const goal = await this.goalModel.create({
      userId: new Types.ObjectId(userId),
      title,
      status: 'active',
    });
    this.logger.log(`[createGoal] stored goalId=${goal.id} userId=${userId}`);
    return { message: 'Goal saved', goalId: goal.id };
  }

  async getGoals(userId: string) {
    this.logger.log(`[getGoals] userId=${userId}`);
    const goals = await this.goalModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
    this.logger.log(`[getGoals] userId=${userId} count=${goals.length}`);
    return { goals };
  }

  async upsertNotifications(
    userId: string,
    smartAlerts: boolean,
    predictionAlerts: boolean,
    humorAlerts: boolean,
  ) {
    this.logger.log(
      `[upsertNotifications] userId=${userId} smart=${smartAlerts} prediction=${predictionAlerts} humor=${humorAlerts}`,
    );
    const settings = await this.notificationSettingModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { smartAlerts, predictionAlerts, humorAlerts },
      { upsert: true, new: true },
    );
    this.logger.log(
      `[upsertNotifications] stored settingsId=${settings?.id ?? 'unknown'} userId=${userId}`,
    );
    return { message: 'Notification settings saved', settings };
  }

  async getNotifications(userId: string) {
    this.logger.log(`[getNotifications] userId=${userId}`);
    const settings = await this.notificationSettingModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();
    this.logger.log(
      `[getNotifications] userId=${userId} found=${settings ? 'yes' : 'no'} settingsId=${settings?._id ?? '-'}`,
    );
    return { settings };
  }
}
