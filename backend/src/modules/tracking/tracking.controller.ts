import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CurrentUserData } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { TrackingService } from './tracking.service';

class MoodEntryDto {
  @IsInt()
  @Min(1)
  @Max(10)
  irritability!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  fatigue!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

class CycleEntryDto {
  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  symptoms?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  energyLevel?: number;
}

class PreferencesDto {
  @IsString()
  helpfulActions!: string;

  @IsString()
  avoidActions!: string;

  @IsBoolean()
  shareMood!: boolean;

  @IsBoolean()
  shareCycle!: boolean;

  @IsOptional()
  @IsString()
  importantTiming?: string;
}

class GoalDto {
  @IsString()
  title!: string;
}

class NotificationDto {
  @IsBoolean()
  smartAlerts!: boolean;

  @IsBoolean()
  predictionAlerts!: boolean;

  @IsBoolean()
  humorAlerts!: boolean;
}

@Controller('tracking')
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('mood')
  createMood(@CurrentUserData() user: { userId: string }, @Body() body: MoodEntryDto) {
    return this.trackingService.createMood(
      user.userId,
      body.irritability,
      body.fatigue,
      body.note,
    );
  }

  @Get('mood/me')
  getRecent(@CurrentUserData() user: { userId: string }) {
    return this.trackingService.getRecent(user.userId);
  }

  @Post('cycle')
  createCycle(
    @CurrentUserData() user: { userId: string; role: 'male' | 'female' | 'other' },
    @Body() body: CycleEntryDto,
  ) {
    return this.trackingService.createCycle(
      user.userId,
      user.role,
      body.startDate,
      body.endDate,
      body.symptoms ?? [],
      body.energyLevel,
    );
  }

  @Get('cycle/me')
  getCycles(@CurrentUserData() user: { userId: string }) {
    return this.trackingService.getCycles(user.userId);
  }

  @Get('cycle/view')
  getVisibleCycles(
    @CurrentUserData() user: { userId: string; role: 'male' | 'female' | 'other' },
  ) {
    return this.trackingService.getVisibleCycles(user.userId, user.role);
  }

  @Post('preferences')
  savePreferences(
    @CurrentUserData() user: { userId: string },
    @Body() body: PreferencesDto,
  ) {
    return this.trackingService.upsertPreferences(
      user.userId,
      body.helpfulActions,
      body.avoidActions,
      body.shareMood,
      body.shareCycle,
      body.importantTiming ?? '',
    );
  }

  @Get('preferences/me')
  getPreferences(@CurrentUserData() user: { userId: string }) {
    return this.trackingService.getPreferences(user.userId);
  }

  @Post('preferences/delete')
  deletePreferences(@CurrentUserData() user: { userId: string }) {
    return this.trackingService.deletePreferences(user.userId);
  }

  @Post('goals')
  createGoal(@CurrentUserData() user: { userId: string }, @Body() body: GoalDto) {
    return this.trackingService.createGoal(user.userId, body.title);
  }

  @Get('goals/me')
  getGoals(@CurrentUserData() user: { userId: string }) {
    return this.trackingService.getGoals(user.userId);
  }

  @Post('notifications')
  saveNotifications(
    @CurrentUserData() user: { userId: string },
    @Body() body: NotificationDto,
  ) {
    return this.trackingService.upsertNotifications(
      user.userId,
      body.smartAlerts,
      body.predictionAlerts,
      body.humorAlerts,
    );
  }

  @Get('notifications/me')
  getNotifications(@CurrentUserData() user: { userId: string }) {
    return this.trackingService.getNotifications(user.userId);
  }
}
