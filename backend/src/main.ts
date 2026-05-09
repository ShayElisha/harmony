import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing required environment variable: MONGO_URI');
  }

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const frontendOriginRaw = config.get<string>('FRONTEND_ORIGIN') ?? '*';
  const frontendOrigins =
    frontendOriginRaw === '*'
      ? true
      : frontendOriginRaw.split(',').map((origin) => origin.trim());

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  console.log(
    `[bootstrap] mongodb connected db=${mongoose.connection.name} host=${mongoose.connection.host} readyState=${mongoose.connection.readyState} totalConnections=${mongoose.connections.length}`,
  );
  const port = Number(config.get<string>('PORT') ?? 3000);
  await app.listen(port);
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error);
});

void bootstrap();
