import { Injectable, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GlobalMessagesDocument } from './type/type';
import { Model, MongooseError } from 'mongoose';
import { EnvConfig } from '../type/type';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { GlobalMessagesCash } from './type/type';

@Injectable()
export class ChatGlobalService {
  private limit: number;
  constructor(
    @InjectModel('GlobalMessage')
    private readonly globalMessages: Model<GlobalMessagesDocument>,
    private readonly configService: ConfigService<EnvConfig>,
  ) {
    this.limit = Number(
      this.configService.getOrThrow<string>('MESSAGE_CASH_LIMIT_GLOBAL'),
    );
  }

  async getMessages(): Promise<GlobalMessagesDocument[]> {
    try {
      const findFirstLevelMessages = await this.globalMessages
        .find({ parentid: null })
        .sort({ timestamp: -1 })
        .limit(this.limit);

      if (!findFirstLevelMessages.length) {
        return [];
      }

      return findFirstLevelMessages;
    } catch (error) {
      console.log(error);
      if (error instanceof MongooseError) {
        throw new WsException(error);
      }
      if (error instanceof WsException) {
        throw new WsException(error);
      }

      throw new HttpException('ошибка сервера', 500);
    }
  }

  async pushMessage(messages: GlobalMessagesCash[]): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const push = await this.globalMessages.insertMany(messages, {
        ordered: false,
      });
    } catch (error) {
      console.log(error);
      if (error instanceof MongooseError) {
        throw new WsException(error);
      }

      if (error instanceof WsException) {
        throw new WsException(error);
      }

      throw new HttpException('Ошибка при записи сообщения', 500);
    }
  }
}
