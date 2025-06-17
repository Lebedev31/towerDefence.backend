import { HttpException, Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { WsException } from '@nestjs/websockets';
import { EnvConfig } from '../../type/type';
import { ConfigService } from '@nestjs/config';
import {
  RedisRoomChat,
  GlobalMessages,
  Message,
  GlobalMessageCashRoom,
} from '../type/type';

type ModReturnCash = 1 | 2 | 3;

export interface BaseCash<T, K> {
  createRoomDialogue(nameRoom: string, message: T | T[]): Promise<void>;
  pushNewMessage(
    message: T,
    flag: boolean,
    cacheObj: K,
    roomName: string,
    limit?: number,
  ): Promise<void>;
}

@Injectable()
export abstract class BaseCasheService<
  T extends Message | GlobalMessages,
  K extends RedisRoomChat | GlobalMessageCashRoom,
> implements BaseCash<T, K>
{
  protected ttl: number;
  protected limit: number;
  constructor(
    protected readonly cacheManager: RedisService,
    protected readonly configService: ConfigService<EnvConfig>,
  ) {
    this.ttl = Number(
      this.configService.getOrThrow<string>('RESIS_TTL_DIALOGUE'),
    );
  }

  abstract createRoomDialogue(
    nameRoom: string,
    message: T | T[],
  ): Promise<void>;

  abstract pushNewMessage(
    message: T,
    flag: boolean,
    cacheObj: K,
    roomName: string,
    limit?: number,
  ): Promise<void>;

  async getRoomDialogue(
    nameRoom: string,
    mod: ModReturnCash,
  ): Promise<K | null | T[]> {
    try {
      const raw = await this.cacheManager.get<K>(nameRoom);
      if (!raw) {
        return null;
      } else {
        switch (mod) {
          case 1:
            return raw.messageArr1 as T[];
          case 2:
            return raw.messageArr2 as T[];
          case 3:
            return raw;
          default:
            return null;
        }
      }
    } catch (error) {
      if (error instanceof WsException) {
        throw new WsException('Некорректные данные в кеше Redis');
      }

      throw new HttpException('Серверная ошибка', 500);
    }
  }

  async cashLimitMessage(message: T, roomName: string) {
    const cacheRaw = await this.getRoomDialogue(roomName, 3);
    if (!cacheRaw || Array.isArray(cacheRaw)) {
      // Проверяем, что вернулся именно RedisRoomChat
      throw new WsException('Кэш не существует или повреждён');
    }

    const cacheObj = cacheRaw;
    const size = cacheObj.messageArr1.length;
    if (size < this.limit) {
      await this.pushNewMessage(message, true, cacheObj, roomName);
    } else {
      await this.pushNewMessage(message, false, cacheObj, roomName, this.limit);
    }
  }

  protected async createBackupKey(originalKey: string): Promise<void> {
    const backupKey = `_chat_${originalKey}`;
    // Храним пустую строку, но с ttl
    await this.cacheManager.set(backupKey, '', this.ttl - 5);
  }
}
