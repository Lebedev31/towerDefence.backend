import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, EnvConfig } from '../type/type';
import { TokenService } from '../token/token.service';
import { AuthPublicData } from '../type/type';
import { WsException } from '@nestjs/websockets';
import { Dialogue, Client, Message, MessageUser } from './type/type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly tokenService: TokenService,
    @InjectModel('Dialogue') private readonly dialogueModel: Model<Dialogue>,
    private readonly configService: ConfigService<EnvConfig>,
  ) {}

  async getInfoClient(token: string): Promise<AuthPublicData> {
    try {
      const payload = this.tokenService.verifyToken(token, false);
      const user = await this.userModel
        .findOne({ email: payload.payload })
        .exec();
      if (!user) {
        throw new WsException('Пользователь не найден');
      }
      const newId = user._id as string;
      return { name: user.name, id: newId.toString() };
    } catch (error) {
      console.error('Ошибка при получении информации о пользователе:', error);
      if (error instanceof WsException) {
        throw new WsException(error.message);
      }
      throw new HttpException('ошибка сервера', 500);
    }
  }

  createRoomName(id1: string, id2: string): string {
    if (typeof id1 !== 'string' && typeof id2 !== 'string') {
      throw new WsException('id1 и id2 должны быть строками');
    }
    const [first, second] = [id1, id2].sort();
    return `${first}:${second}`;
  }

  async getDialogue(idDialogue: string): Promise<MessageUser[] | null> {
    try {
      const findDialogue = await this.dialogueModel
        .findOne({ id: idDialogue })
        .exec();

      if (!findDialogue) {
        return null;
      }
      const limmitMessage =
        this.configService.getOrThrow<string>('MESSAGE_CASH_LIMIT');

      return findDialogue.messages.slice(0, +limmitMessage);
    } catch (error) {
      if (error instanceof WsException) {
        throw new WsException('Ошибка при получении диалога');
      }

      throw new HttpException('Серверная ошибка', 500);
    }
  }

  creeatePropertyRooms(
    roomName: string,
    user1Id: string,
    user2Id: string,
    clientObj: Client,
  ) {
    if (!clientObj.room) {
      clientObj.room = {
        roomName: roomName,
        user1Id: user1Id,
        user2Id: user2Id,
      };
    }
  }

  async createDialogue(
    user1Id: string,
    user2Id: string,
    message: Message,
  ): Promise<Dialogue> {
    try {
      const newDialogue = new this.dialogueModel({
        id: this.createRoomName(user1Id, user2Id),
        user1Id,
        user2Id,
        messages: [message],
      });
      return await newDialogue.save();
    } catch (error) {
      console.log(error);
      if (error instanceof WsException) {
        throw new WsException('Ошибка при создании диалога');
      }

      throw new HttpException('Серверная ошибка', 500);
    }
  }
}
