import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { userSchema } from '../user/user.model';
import { TokenModule } from '../token/token.module';
import { DialogueSchema } from './models/dialogue.model';
import { ChatRedisService } from './chat.redis.service';
import { GlobalMessagesSchema } from './models/globalChat.model';
import { ChatGlobalService } from './chat.global.service';
import { ChatGlobalRedisService } from './chat.global.redis.service';

@Module({
  providers: [
    ChatGateway,
    ChatService,
    ChatRedisService,
    ChatGlobalService,
    ChatGlobalRedisService,
  ],
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: userSchema },
      { name: 'Dialogue', schema: DialogueSchema },
      { name: 'GlobalMessage', schema: GlobalMessagesSchema },
    ]),
    TokenModule,
  ],
})
export class ChatModule {}
