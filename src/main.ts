import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });
  const port = configService.get<number>('PORT');
  await app.listen(port ?? 5000);
}
bootstrap();
