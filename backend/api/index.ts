import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';

type Handler = (req: Request, res: Response) => void | Promise<void>;

const expressApp = express();
let cachedHandler: Handler | null = null;
let cachedAppModule: unknown | null = null;

async function getAppModule(): Promise<unknown> {
  if (cachedAppModule) return cachedAppModule;

  try {
    const built = await import('../dist/app.module.js');
    cachedAppModule = built.AppModule;
    return cachedAppModule;
  } catch {
    const source = await import('../src/app.module');
    cachedAppModule = source.AppModule;
    return cachedAppModule;
  }
}

async function getHandler(): Promise<Handler> {
  if (cachedHandler) return cachedHandler;

  const appModule = await getAppModule();
  const nestApp = await NestFactory.create(appModule as never, new ExpressAdapter(expressApp));
  nestApp.enableCors({ origin: true, credentials: true });
  nestApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await nestApp.init();

  cachedHandler = expressApp as unknown as Handler;
  return cachedHandler;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const appHandler = await getHandler();
  await appHandler(req, res);
}
