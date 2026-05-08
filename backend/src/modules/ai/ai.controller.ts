import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { CurrentUserData } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AiService } from './ai.service';

class AiInputDto {
  @IsString()
  @MinLength(2)
  input!: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('translate')
  async translate(@CurrentUserData() user: { userId: string }, @Body() body: AiInputDto) {
    return this.aiService.translate(user.userId, body.input);
  }

  @Post('emergency')
  async emergency(@CurrentUserData() user: { userId: string }, @Body() body: AiInputDto) {
    return this.aiService.emergency(user.userId, body.input);
  }

  @Get('logs/me')
  async logs(@CurrentUserData() user: { userId: string }) {
    return this.aiService.getRecentLogs(user.userId);
  }
}
