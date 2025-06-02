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

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<string | null> {
    if (ttlSeconds) {
      return this.redisClient.set(key, value, { EX: ttlSeconds });
    }
    return this.redisClient.set(key, value);
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
