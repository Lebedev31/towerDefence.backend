import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvConfig } from '../type/type';
import { ConfigService } from '@nestjs/config';
import { Message, RedisRoomChat } from './type/type';
import { WsException } from '@nestjs/websockets';
import { Dialogue } from './type/type';
import { MongooseError } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { BaseCasheService, BaseCash } from './abstractClass/base.cashe.service';

@Injectable()
export class ChatRedisService
  extends BaseCasheService<Message, RedisRoomChat>
  implements BaseCash<Message, RedisRoomChat>
{
  protected ttl: number;
  constructor(
    protected readonly cacheManager: RedisService,
    @InjectModel('Dialogue') private readonly dialogueModel: Model<Dialogue>,
    protected readonly configService: ConfigService<EnvConfig>,
  ) {
    super(cacheManager, configService);
    this.ttl = Number(
      this.configService.getOrThrow<string>('RESIS_TTL_DIALOGUE'),
    );
  }

  /** Создаёт новый «комнатный» кэш, если его нет */
  async createRoomDialogue(nameRoom: string, message: Message | Message[]) {
    const existingCache = await this.getRoomDialogue(nameRoom.trim(), 3);
    if (existingCache) {
      return;
    }

    const cacheObj: RedisRoomChat = {
      messageArr1: [],
      messageArr2: [],
    };
    if (Array.isArray(message)) {
      cacheObj.messageArr1.push(...message);
    } else {
      cacheObj.messageArr1.push(message);
    }

    // СЕРИАЛИЗУЕМ В JSON
    await this.cacheManager.set(nameRoom, JSON.stringify(cacheObj), this.ttl);
    await this.createBackupKey(nameRoom);
  }

  async pushNewMessage(
    message: Message,
    flag: boolean,
    cacheObj: RedisRoomChat,
    roomName: string,
    limit?: number,
  ): Promise<void> {
    if (flag) {
      // если текущий cache меньше лимита
      cacheObj.messageArr1.push(message);
    } else {
      // если cache больше лимита…
      if (limit && cacheObj.messageArr2.length < limit) {
        const del = cacheObj.messageArr1.shift()!;
        cacheObj.messageArr2.push(del);
      } else if (roomName) {
        // второй cache полный → сбрасываем его в Mongo
        try {
          await this.dialogueModel.updateOne(
            { id: roomName },
            { $push: { messages: { $each: cacheObj.messageArr2 } } },
          );
          cacheObj.messageArr2 = [];
        } catch (error) {
          console.log(error);
          if (error instanceof MongooseError || error instanceof WsException) {
            throw new WsException('Ошибка при обновлении сообщений в БД');
          }
        }
      }
      cacheObj.messageArr1.push(message);
    }

    // Снова сериализуем весь объект и сохраняем в Redis
    await this.cacheManager.set(roomName, cacheObj, this.ttl);
    await this.createBackupKey(roomName);
  }
}
