// src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvConfig } from '../type/type';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Global() // Делаем модуль глобальным
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvConfig>) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET_ACCESS'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),

    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<EnvConfig>) => ({
        store: await redisStore({
          url: configService.getOrThrow<string>('REDIS_URL'),
        }),
        isGlobal: true,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [JwtModule, CacheModule],
})
export class CommonModule {}
