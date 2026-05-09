type Handler = (req: any, res: any) => void | Promise<void>;

let cachedHandler: Handler | null = null;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function getHandler(): Promise<Handler> {
  if (cachedHandler) return cachedHandler;

  await import('reflect-metadata');
  const { ValidationPipe } = await import('@nestjs/common');
  const { NestFactory } = await import('@nestjs/core');
  const { ExpressAdapter } = await import('@nestjs/platform-express');
  const express = (await import('express')).default;
  const mongoose = (await import('mongoose')).default;
  const { AppModule } = await import('../src/app.module');
  const expressApp = express();
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  nestApp.use((req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
  nestApp.enableCors({ origin: true, credentials: true });
  nestApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await nestApp.init();
  console.log(
    `[api] mongodb connected db=${mongoose.connection.name} host=${mongoose.connection.host} readyState=${mongoose.connection.readyState} totalConnections=${mongoose.connections.length}`,
  );

  cachedHandler = expressApp as unknown as Handler;
  return cachedHandler;
}

export default async function handler(req: any, res: any): Promise<void> {
  try {
    console.log(`[api] incoming ${req.method} ${req.url}`);
    if (req.url.startsWith('/api/')) {
      req.url = req.url.replace('/api', '');
    } else if (req.url === '/api') {
      req.url = '/';
    }
    console.log(`[api] normalized ${req.method} ${req.url}`);
    const appHandler = await withTimeout(getHandler(), 12000, 'Nest bootstrap');
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
