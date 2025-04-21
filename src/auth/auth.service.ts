import {
  Injectable,
  UnauthorizedException,
  HttpException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserPublicData } from '../type/type';
import { Model } from 'mongoose';
import { UserService } from '../user/user.service';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly userService: UserService,
  ) {}

  async registration(
    name: string,
    email: string,
    password: string,
  ): Promise<UserPublicData> {
    const register = await this.userService.createUser(name, email, password);
    return register;
  }

  setCreateCookie(response: Response, token: string): void {
    response.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    });
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const find = await this.userModel.findOne({ email });
      if (!find) {
        throw new UnauthorizedException('Такого пользователя не существует');
      }
      const decode = await bcrypt.compare(password, find.password);
      if (!decode) {
        throw new UnauthorizedException('Неправильный пароль');
      }
    } catch (error) {
      console.log(error);
      if (error instanceof HttpException) {
        throw new BadRequestException('Неправильный запрос');
      }

      throw new InternalServerErrorException('Неизестная серверная ошибка');
    }
  }

  setAuthorization(response: Response, accessToken: string): void {
    response.set('Authorization', `Bearer${accessToken}`);
  }
}
