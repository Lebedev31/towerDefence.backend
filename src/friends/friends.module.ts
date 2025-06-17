import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [FriendsController],
  providers: [FriendsService],
  imports: [UserModule, TokenModule],
})
export class FriendsModule {}
