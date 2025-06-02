import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserPublicData, Friend } from '../type/type';
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

  // Добавляем новые методы для работы с друзьями

  // Метод для добавления друга
  async addFriend(userId: string, friendId: string): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId);
      const friend = await this.userModel.findById(friendId);

      if (!user || !friend) {
        return false;
      }

      // Проверяем, есть ли уже такой друг
      const existingFriend = user.friends.find((f) => f.id === friendId);
      if (existingFriend) {
        return true; // Друг уже добавлен
      }

      // Добавляем друга пользователю
      user.friends.push({
        id: friendId,
        name: friend.name,
      });

      await user.save();
      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConflictException(
          `Ошибка при добавлении друга: ${error.message}`,
        );
      }
      throw new InternalServerErrorException('Серверная ошибка');
    }
  }

  // Метод для удаления друга
  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        return false;
      }

      // Удаляем друга из списка
      user.friends = user.friends.filter((f) => f.id !== friendId);

      await user.save();
      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConflictException(
          `Ошибка при удалении друга: ${error.message}`,
        );
      }
      throw new InternalServerErrorException('Серверная ошибка');
    }
  }

  // Метод для получения списка друзей
  async getFriends(userId: string): Promise<Friend[]> {
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        return [];
      }

      return user.friends;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConflictException(
          `Ошибка при получении списка друзей: ${error.message}`,
        );
      }
      throw new InternalServerErrorException('Серверная ошибка');
    }
  }
}
