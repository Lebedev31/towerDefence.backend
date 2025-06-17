import { HttpException, Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ChatGlobalService } from './chat.global.service';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '../type/type';
import { WsException } from '@nestjs/websockets';
import { GlobalMessageCashRoom, GlobalMessagesCash } from './type/type';
import { BaseCasheService, BaseCash } from './abstractClass/base.cashe.service';

@Injectable()
export class ChatGlobalRedisService
  extends BaseCasheService<GlobalMessagesCash, GlobalMessageCashRoom>
  implements BaseCash<GlobalMessagesCash, GlobalMessageCashRoom>
{
  protected ttl: number;
  private globalChatName: string;
  protected limit: number;

  constructor(
    protected readonly casheManager: RedisService,
    private readonly chatGlobalService: ChatGlobalService,
    protected readonly configService: ConfigService<EnvConfig>,
  ) {
    super(casheManager, configService);
    this.ttl = Number(
      this.configService.getOrThrow<string>('RESIS_TTL_DIALOGUE'),
    );

    this.globalChatName = this.configService.getOrThrow<string>('GLOBAL_CHAT');
    this.limit = Number(
      this.configService.getOrThrow<string>('MESSAGE_CASH_LIMIT_GLOBAL'),
    );
  }

  async createRoomDialogue(): Promise<void> {
    try {
      const existingCash = await this.casheManager.get(this.globalChatName);
      if (existingCash) {
        return;
      }

      const findGlobalMessage =
        (await this.chatGlobalService.getMessages()) as GlobalMessagesCash[];
      const globalMessageCashRoom: GlobalMessageCashRoom = {
        messageArr1: findGlobalMessage,
        messageArr2: [],
      };
      await this.casheManager.set(
        this.globalChatName,
        globalMessageCashRoom,
        this.ttl,
      );
    } catch (error) {
      console.log(error);
      if (error instanceof WsException) {
        throw new WsException(error);
      }

      throw new HttpException('Ошибка при кешировании глобального чата', 500);
    }
  }

  async pushNewMessage(
    message: GlobalMessagesCash,
    flag: boolean,
    cacheObj: GlobalMessageCashRoom,
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
          await this.chatGlobalService.pushMessage(cacheObj.messageArr2);
          cacheObj.messageArr2 = [];
        } catch (error) {
          console.log(error);
          if (error instanceof WsException) {
            throw new WsException('Ошибка при обновлении сообщений в БД');
          }
        }
      }
      cacheObj.messageArr1.push(message);
    }

    // Снова сериализуем весь объект и сохраняем в Redis
    await this.casheManager.set(roomName, cacheObj, this.ttl);
    await this.createBackupKey(roomName);
  }
}
