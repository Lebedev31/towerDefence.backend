// src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvConfig } from '../type/type';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvConfig>) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET_ACCESS'),
        signOptions: { expiresIn: '50m' },
      }),
      inject: [ConfigService],
    }),

    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvConfig>) => ({
        store: createKeyv(configService.getOrThrow<string>('REDIS_URL')),
        isGlobal: true,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [JwtModule, CacheModule],
})
export class CommonModule {}
