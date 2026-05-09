import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUserData } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AiService } from './ai.service';

function assertAiInput(body: unknown): { input: string } {
  if (typeof body !== 'object' || body === null || !('input' in body)) {
    throw new BadRequestException('input is required');
  }
  const input = (body as { input?: unknown }).input;
  if (typeof input !== 'string' || input.trim().length < 2) {
    throw new BadRequestException('input must be a string with at least 2 characters');
  }
  return { input: input.trim() };
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('translate')
  async translate(@CurrentUserData() user: { userId: string }, @Body() body: unknown) {
    const { input } = assertAiInput(body);
    return this.aiService.translate(user.userId, input);
  }

  @Post('emergency')
  async emergency(@CurrentUserData() user: { userId: string }, @Body() body: unknown) {
    const { input } = assertAiInput(body);
    return this.aiService.emergency(user.userId, input);
  }

  @Get('logs/me')
  async logs(@CurrentUserData() user: { userId: string }) {
    return this.aiService.getRecentLogs(user.userId);
  }
}
