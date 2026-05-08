import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiLog, AiLogSchema } from '../../common/schemas/ai-log.schema';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: AiLog.name, schema: AiLogSchema }]),
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
