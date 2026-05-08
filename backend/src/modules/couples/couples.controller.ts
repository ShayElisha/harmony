import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsMongoId, IsString, Length } from 'class-validator';
import { CurrentUserData } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CouplesService } from './couples.service';

class InviteDto {
  @IsString()
  partnerEmail!: string;
}

class ConnectDto {
  @IsString()
  @Length(6, 12)
  inviteCode!: string;
}

class RequestParamDto {
  @IsMongoId()
  requestId!: string;
}

@Controller('couples')
@UseGuards(JwtAuthGuard)
export class CouplesController {
  constructor(private readonly couplesService: CouplesService) {}

  @Post('invite')
  invite(@CurrentUserData() user: { userId: string }, @Body() body: InviteDto) {
    return this.couplesService.invite(user.userId, body.partnerEmail);
  }

  @Post('connect')
  connect(@CurrentUserData() user: { userId: string }, @Body() body: ConnectDto) {
    return this.couplesService.connect(user.userId, body.inviteCode);
  }

  @Get('requests/me')
  requests(@CurrentUserData() user: { userId: string }) {
    return this.couplesService.getIncomingRequests(user.userId);
  }

  @Get('partner/me')
  partner(@CurrentUserData() user: { userId: string }) {
    return this.couplesService.getMyPartner(user.userId);
  }

  @Post('disconnect')
  disconnect(@CurrentUserData() user: { userId: string }) {
    return this.couplesService.disconnect(user.userId);
  }

  @Post('requests/:requestId/approve')
  approve(
    @CurrentUserData() user: { userId: string },
    @Param() params: RequestParamDto,
  ) {
    return this.couplesService.approveRequest(user.userId, params.requestId);
  }

  @Post('requests/:requestId/reject')
  reject(
    @CurrentUserData() user: { userId: string },
    @Param() params: RequestParamDto,
  ) {
    return this.couplesService.rejectRequest(user.userId, params.requestId);
  }
}
