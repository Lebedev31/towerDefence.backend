// redis.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { RedisService } from './redis.service';
import { RedisKeyExpiryListener } from './redis-expiry.listener.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DialogueSchema } from '../chat/models/dialogue.model';

@Global() // Делаем модуль глобальным, чтобы сервис был доступен везде
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: 'Dialogue', schema: DialogueSchema }]),
  ], // Если URL Redis берется из конфигурации
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const client = createClient({
          url: configService.getOrThrow<string>('REDIS_URL'), // Пример получения URL из .env
          // Другие опции подключения
        });
        await client.connect();
        client.on('error', (err) => console.error('Redis Client Error', err));
        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
    RedisKeyExpiryListener, // Экспортируем слушатель
  ],
  exports: [RedisService, 'REDIS_CLIENT', RedisKeyExpiryListener], // Экспортируем сервис и/или клиент
})
export class RedisModule {}
