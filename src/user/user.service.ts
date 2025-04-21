import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserPublicData } from '../type/type';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  async createUser(
    name: string,
    email: string,
    password: string,
  ): Promise<UserPublicData> {
    const find = await this.userModel.findOne({ email });
    if (find) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log(hashedPassword);
      const user = new this.userModel({
        name,
        email,
        password: hashedPassword,
      });
      const save = await user.save();
      const result: UserPublicData = {
        email: save.email,
        name: save.name,
      };
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConflictException(
          `Ошибка при создании пользователя: ${error.message}`,
        );
      }

      throw new InternalServerErrorException('Серверная ошибка');
    }
  }
}
