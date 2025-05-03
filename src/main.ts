import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './exceptions/http-exception.filter';
import * as cookieParser from 'cookie-parser';
import { EnvConfig } from './type/type';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvConfig>);
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
    exposedHeaders: ['Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(cookieParser());
  const port = configService.get<number>('PORT');
  await app.listen(port ?? 5000);
}
bootstrap();
