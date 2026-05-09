import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { AiLog, AiLogDocument } from '../../common/schemas/ai-log.schema';

@Injectable()
export class AiService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @InjectModel(AiLog.name) private readonly aiLogModel: Model<AiLogDocument>,
  ) {}

  private getAiBaseUrl(): string {
    const explicit = this.config.get<string>('AI_SERVICE_URL');
    if (explicit) return explicit;

    const vercelUrl = this.config.get<string>('VERCEL_URL');
    if (vercelUrl) {
      return `https://${vercelUrl}/api/ai`;
    }

    return 'http://localhost:8001';
  }

  async translate(userId: string, input: string) {
    const baseUrl = this.getAiBaseUrl();
    const { data } = await firstValueFrom(
      this.http.post(`${baseUrl}/translate`, { input }),
    );
    await this.aiLogModel.create({
      userId: new Types.ObjectId(userId),
      mode: 'translate',
      prompt: input,
      response: String(data?.result ?? ''),
    });
    return data;
  }

  async emergency(userId: string, input: string) {
    const baseUrl = this.getAiBaseUrl();
    const { data } = await firstValueFrom(
      this.http.post(`${baseUrl}/emergency`, { input }),
    );
    await this.aiLogModel.create({
      userId: new Types.ObjectId(userId),
      mode: 'emergency',
      prompt: input,
      response: String(data?.result ?? ''),
    });
    return data;
  }

  async getRecentLogs(userId: string) {
    const logs = await this.aiLogModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return { logs };
  }
}
