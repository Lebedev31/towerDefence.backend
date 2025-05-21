import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, EnvConfig } from '../type/type';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { Message, RedisRoomChat } from './type/type';

@Injectable()
export class ChatRedisService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly configService: ConfigService<EnvConfig>,
    private readonly chatService: ChatService,
  ) {}

  async createRoomDialogue(nameRoom: string, messages: Message[]) {
    const cash: RedisRoomChat = {
      messageArr1: messages,
      messageArr2: [],
    };
    await this.cacheManager.set<RedisRoomChat>(nameRoom, cash, 3600);
  }

  async getRoomDialogue(nameRoom: string): Promise<Message[] | null> {
    const roomMessages = await this.cacheManager.get<RedisRoomChat>(nameRoom);
    if (!roomMessages) {
      return null;
    }
    return roomMessages.messageArr1;
  }

  private async pushNewMessage(
    message: Message,
    roomName: string,
    flag: boolean,
    limmit?: number,
  ) {
    const cash = (await this.getRoomDialogue(
      roomName,
    )) as unknown as RedisRoomChat;

    if (flag) {
      cash.messageArr1 = [message, ...cash.messageArr1];
    } else {
      const del = cash.messageArr1.pop() as Message;
      cash.messageArr1 = [message, ...cash.messageArr1];
      cash.messageArr2 = [del, ...cash.messageArr2];
    }
  }

  async cashLimitMessage(message: Message, roomName: string) {
    const cash = await this.getRoomDialogue(roomName);
    if (cash) {
      const size = cash.length;
      const limmit = Number(
        this.configService.getOrThrow<string>('MESSAGE_CASH_LIMIT'),
      );
      if (size < limmit) {
        await this.pushNewMessage(message, roomName, true);
        return cash;
      }
    }
  }
}
