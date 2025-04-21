// src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvConfig } from '../type/type';

@Global() // Делаем модуль глобальным
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvConfig>) => ({
        secret: configService.get<string>('JWT_SECRET_ACCESS'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [JwtModule], // Экспортируем JwtModule, чтобы он был доступен в других модулях
})
export class CommonModule {}
