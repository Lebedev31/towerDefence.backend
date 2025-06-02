import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvConfig } from '../type/type';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { Message, RedisRoomChat } from './type/type';
import { WsException } from '@nestjs/websockets';
import { Dialogue } from './type/type';
import { MongooseError } from 'mongoose';
import { RedisService } from '../redis/redis.service';

type ModReturnCash = 1 | 2 | 3;

@Injectable()
export class ChatRedisService {
  private ttl: number;
  constructor(
    private readonly cacheManager: RedisService,
    @InjectModel('Dialogue') private readonly dialogueModel: Model<Dialogue>,
    private readonly configService: ConfigService<EnvConfig>,
    private readonly chatService: ChatService,
  ) {
    this.ttl = Number(
      this.configService.getOrThrow < string > ('RESIS_TTL_DIALOGUE'),
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

  /** Читает из Redis и парсит JSON. Если ключа нет — возвращает null */
  async getRoomDialogue(
    nameRoom: string,
    mod: ModReturnCash,
  ): Promise<RedisRoomChat | null | Message[]> {
    const raw = await this.cacheManager.get(nameRoom); // raw: string | null
    if (!raw) {
      return null;
    }

    let roomMessages: RedisRoomChat;
    try {
      roomMessages = JSON.parse(raw);
    } catch (e) {
      // Некорректный JSON в кеше
      throw new WsException('Некорректные данные в кеше Redis');
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
    await this.cacheManager.set(roomName, JSON.stringify(cacheObj), this.ttl);
    await this.createBackupKey(roomName);
  }

  async cashLimitMessage(message: Message, roomName: string) {
    const cacheRaw = await this.getRoomDialogue(roomName, 3);
    if (!cacheRaw || Array.isArray(cacheRaw)) {
      // Проверяем, что вернулся именно RedisRoomChat
      throw new WsException('Кэш не существует или повреждён');
    }

    const cacheObj = cacheRaw as RedisRoomChat;
    const size = cacheObj.messageArr1.length;
    const limit = Number(
      this.configService.getOrThrow < string > ('MESSAGE_CASH_LIMIT'),
    );
    if (size < limit) {
      await this.pushNewMessage(message, true, cacheObj, roomName);
    } else {
      await this.pushNewMessage(message, false, cacheObj, roomName, limit);
    }
  }

  /** Создаёт «резервный» ключ (_имя) с пустым значением, просто чтобы у ключа был ttl */
  private async createBackupKey(originalKey: string): Promise<void> {
    const backupKey = `_chat_${originalKey}`;
    // Храним пустую строку, но с ttl
    await this.cacheManager.set(backupKey, '', this.ttl - 5);
  }
}

