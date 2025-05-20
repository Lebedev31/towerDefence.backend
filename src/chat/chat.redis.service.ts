import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, EnvConfig } from '../type/type';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { MessageUser } from './type/type';

@Injectable()
export class ChatRedisService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly configService: ConfigService<EnvConfig>,
    private readonly chatService: ChatService,
  ) {}

  async createRoomDialogue(nameRoom: string, messages: MessageUser[]) {
    await this.cacheManager.set(nameRoom, messages, 3600);
  }

  async getRoomDialogue(nameRoom: string): Promise<MessageUser[] | null> {
    const roomMessages = await this.cacheManager.get<MessageUser[]>(nameRoom);
    if (!roomMessages) {
      return null;
    }
    return roomMessages;
  }
}
