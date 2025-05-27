import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvConfig } from '../type/type';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { Message, RedisRoomChat } from './type/type';
import { WsException } from '@nestjs/websockets';
import { Dialogue } from './type/type';
import { MongooseError } from 'mongoose';

type ModReturnCash = 1 | 2 | 3;

@Injectable()
export class ChatRedisService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectModel('Dialogue') private readonly dialogueModel: Model<Dialogue>,
    private readonly configService: ConfigService<EnvConfig>,
    private readonly chatService: ChatService,
  ) {}

  async createRoomDialogue(nameRoom: string, message: Message | Message[]) {
    const existingCash = await this.getRoomDialogue(nameRoom.trim(), 3);
    if (existingCash) {
      return;
    }
    const cash: RedisRoomChat = {
      messageArr1: [],
      messageArr2: [],
    };
    if (Array.isArray(message)) {
      cash.messageArr1.push(...message);
    } else {
      cash.messageArr1.push(message);
    }
    await this.cacheManager.set<RedisRoomChat>(nameRoom, cash, 3600 * 100);
  }

  async getRoomDialogue(
    nameRoom: string,
    mod: ModReturnCash,
  ): Promise<RedisRoomChat | null | Message[]> {
    const roomMessages = await this.cacheManager.get<RedisRoomChat>(nameRoom);
    if (!roomMessages) {
      return null;
    }
    switch (mod) {
      case 1:
        return roomMessages.messageArr1;
      case 2:
        return roomMessages.messageArr2;
      case 3:
        return roomMessages;
      default:
        return null;
    }
  }

  private async pushNewMessage(
    message: Message,
    flag: boolean,
    cash: RedisRoomChat,
    roomName: string,
    limmit?: number,
  ): Promise<void> {
    if (flag) {
      // если 1 кеш меньше лимита
      cash.messageArr1.push(message); // добавляем новое сообщение в начало кеша
    } else {
      // если кеш больше лимита, то удаляем последний элемент и добавляем в второй кеш
      if (limmit && cash.messageArr2.length < limmit) {
        const del = cash.messageArr1.pop() as Message;
        cash.messageArr1.push(message);
        cash.messageArr2.push(del);
      } else if (roomName) {
        // второй кеш полный то очищаем его и передаем сообщения в монго
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const update = await this.dialogueModel.updateOne(
            { id: roomName },
            {
              $push: { messages: { $each: cash.messageArr2 } },
            },
          );

          cash.messageArr2 = []; // очищаем второй кеш
        } catch (error) {
          console.log(error);
          if (error instanceof MongooseError || error instanceof WsException) {
            throw new WsException(
              'Ошибка при обновлении сообщений в базе данных',
            );
          }
        }
      }
    }
    // сохраняем обновленный кеш
    await this.cacheManager.set<RedisRoomChat>(roomName, cash, 3600 * 100);
  }

  async cashLimitMessage(message: Message, roomName: string) {
    const cash = (await this.getRoomDialogue(roomName, 3)) as RedisRoomChat;
    const newCash: RedisRoomChat = {
      messageArr1: [...cash.messageArr1],
      messageArr2: [...cash.messageArr2],
    };
    if (!cash) throw new WsException('Кеша не существует');

    const size = cash.messageArr1.length;
    const limmit = Number(
      this.configService.getOrThrow<string>('MESSAGE_CASH_LIMIT'),
    );
    if (size < limmit) {
      await this.pushNewMessage(message, true, newCash, roomName);
    } else {
      await this.pushNewMessage(message, false, newCash, roomName, limmit);
    }
  }
}
