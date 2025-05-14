import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { userSchema } from '../user/user.model';
import { TokenModule } from '../token/token.module';

@Module({
  providers: [ChatGateway, ChatService],
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: userSchema }]),
    TokenModule,
  ],
})
export class ChatModule {}
