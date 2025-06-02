import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { MongooseModule } from '@nestjs/mongoose';
import { userSchema } from '../user/user.model';
import { TokenModule } from '../token/token.module';
import { DialogueSchema } from './models/dialogue.model';
import { ChatRedisService } from './chat.redis.service';


@Module({
  providers: [
    ChatGateway,
    ChatService,
    ChatRedisService,
  ],
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: userSchema },
      { name: 'Dialogue', schema: DialogueSchema },
    ]),
    TokenModule,
  ],
})
export class ChatModule { }
