import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../type/type';
import { TokenService } from '../token/token.service';
import { AuthPublicData } from '../type/type';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly tokenService: TokenService,
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
      return { name: user.name, id: newId };
    } catch (error) {
      console.error('Ошибка при получении информации о пользователе:', error);
      if (error instanceof WsException) {
        throw new WsException(error.message);
      }
      throw new HttpException('ошибка сервера', 500);
    }
  }
}
