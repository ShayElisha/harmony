import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { CouplesModule } from './modules/couples/couples.module';
import { HealthModule } from './modules/health/health.module';
import { TrackingModule } from './modules/tracking/tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        if (!uri) {
          throw new Error('MONGO_URI is required in runtime environment');
        }
        return {
          uri,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 10000,
          maxPoolSize: 5,
        };
      },
    }),
    HealthModule,
    AuthModule,
    CouplesModule,
    TrackingModule,
    AiModule,
  ],
})
export class AppModule {}
