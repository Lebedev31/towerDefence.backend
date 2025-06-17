import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, Friend } from '../type/type';

@Injectable()
export class FriendsService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  // Добавляем новые методы для работы с друзьями

  // Метод для добавления друга
  async addFriend(email: string, friendId: string): Promise<boolean> {
    console.log(email);
    console.log(friendId);
    try {
      const user = await this.userModel.findOne({ email });
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
      const pushFriends = await this.userModel.updateOne(
        { _id: user._id },
        {
          $addToSet: {
            friends: {
              id: friendId,
              name: friend.name,
            },
          },
        },
      );
      return pushFriends.modifiedCount > 0;
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
  async removeFriend(email: string, friendId: string): Promise<boolean> {
    try {
      const user = await this.userModel.findOne({ email });

      if (!user) {
        return false;
      }

      const deleteFriend = await this.userModel.updateOne(
        { _id: user._id },
        {
          $pull: { friends: { id: friendId } },
        },
      );

      return deleteFriend.modifiedCount > 0;
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
  async getFriends(email: string): Promise<Friend[]> {
    try {
      const user = await this.userModel.findOne({ email });

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
