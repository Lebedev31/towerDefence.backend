// redis.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType, createClient } from 'redis';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '../type/type';

@Injectable()
export class RedisService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
    private readonly configService: ConfigService<EnvConfig>,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<void | null> {
    if (value) {
      const seriallize = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redisClient.set(key, seriallize, { EX: ttlSeconds });
      }
      await this.redisClient.set(key, seriallize);
    }

    return null;
  }
  getClient(): RedisClientType {
    return this.redisClient;
  }

  async getSubscriber(): Promise<RedisClientType> {
    // создаём новый клиент с тем же конфигом подключения
    const sub = createClient({
      // можно взять URL или host/port из ENV
      url: this.configService.getOrThrow<string>('REDIS_URL'),
      // или взять из redisClient.options, если храните там информацию
    });
    await sub.connect();
    return sub as RedisClientType;
  }
}
