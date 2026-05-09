import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';
import { AppModule } from '../src/app.module';

type Handler = (req: Request, res: Response) => void | Promise<void>;

const expressApp = express();
let cachedHandler: Handler | null = null;

async function getHandler(): Promise<Handler> {
  if (cachedHandler) return cachedHandler;

  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  nestApp.enableCors({ origin: true, credentials: true });
  nestApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await nestApp.init();

  cachedHandler = expressApp as unknown as Handler;
  return cachedHandler;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const appHandler = await getHandler();
    await appHandler(req, res);
  } catch (error) {
    console.error('backend/api handler failed', error);
    if (!res.headersSent) {
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
}
