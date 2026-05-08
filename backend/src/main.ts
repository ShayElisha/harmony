import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const frontendOriginRaw = config.get<string>('FRONTEND_ORIGIN') ?? '*';
  const frontendOrigins =
    frontendOriginRaw === '*'
      ? true
      : frontendOriginRaw.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(config.get<string>('PORT') ?? 3000);
  await app.listen(port);
}

void bootstrap();
