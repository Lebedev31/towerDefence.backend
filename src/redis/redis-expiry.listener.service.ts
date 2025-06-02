// src/redis/redis-expiry.listener.ts
import { Injectable, OnModuleInit, HttpException } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisClientType } from 'redis';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Dialogue } from '../chat/type/type';
import { RedisRoomChat } from '../chat/type/type';
import { MongooseError } from 'mongoose';

@Injectable()
export class RedisKeyExpiryListener implements OnModuleInit {
  private subscriberClient: RedisClientType;
  constructor(
    private readonly redisService: RedisService,
    @InjectModel('Dialogue') private readonly dialogueModel: Model<Dialogue>,
  ) {}

  async onModuleInit() {
    this.subscriberClient = await this.redisService.getSubscriber();
    const expiredChannel = `__keyevent@0__:expired`;

    await this.subscriberClient.subscribe(
      expiredChannel,
      (expiredKey: string) => {
        this.handleExpiredKey(expiredKey).catch((err) => {
          console.log(
            `Ошибка при обработке истекшего ключа "${expiredKey}": ${err}`,
          );
          throw new HttpException('ошибка при поключению канала редис', 500);
        });
      },
    );

    console.log(`Подписка на канал Redis: ${expiredChannel}`);
  }

  private async handleExpiredKey(key: string) {
    console.log(`Ключ "${key}" истёк.`);
    if (key.startsWith('_chat_')) {
      const id = key.replace('_chat_', '');
      await this.saveCasheDialogue(id);
      console.log('Сообщения добавлены в диалог');
    }
  }

  private async parseCash(id: string) {
    const cash = await this.redisService.get(id);
    if (cash) {
      return JSON.parse(cash) as RedisRoomChat;
    }
    throw new HttpException(
      'Не найден кеш, либо произошла ошибка обработки. Диалог не сохранен в бд',
      404,
    );
  }

  private async saveCasheDialogue(id: string) {
    try {
      const cash = await this.parseCash(id);
      const flat = [...cash.messageArr1, ...cash.messageArr2];
      //добавляем только уникальные сообщения
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const pushDialogue = await this.dialogueModel.updateOne(
        { id },
        { $addToSet: { messages: { $each: flat } } },
      );
    } catch (error) {
      console.log(error);
      if (error instanceof MongooseError) {
        throw new HttpException('Ошибка сохранения диалога в бд', 500);
      }

      throw new HttpException(
        'Не найден кеш, либо произошла ошибка обработки. Диалог не сохранен в бд',
        404,
      );
    }
  }
}
