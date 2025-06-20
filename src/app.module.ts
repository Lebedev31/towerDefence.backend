import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TokenModule } from './token/token.module';
import { EnvConfig } from './type/type';
import { CommonModule } from './config/config.common';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AvtorizationMiddleware } from './middleware/avtorization.middleware';
import { ChatModule } from './chat/chat.module';
import { RedisModule } from './redis/redis.module';
import { FriendsController } from './friends/friends.controller';
import { FriendsService } from './friends/friends.service';
import { FriendsModule } from './friends/friends.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvConfig>) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuthModule,
    CommonModule,
    TokenModule,
    ChatModule,
    RedisModule,
    FriendsModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class AppModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AvtorizationMiddleware).forRoutes('friends');
  }
}
