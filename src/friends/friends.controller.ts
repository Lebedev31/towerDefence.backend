import {
  Controller,
  UseGuards,
  Get,
  Req,
  NotFoundException,
  Post,
  Body,
  Delete,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { AvtorizationGuard } from '../token/guard/avtorization.guard';
import { Request } from 'express';
import { FriendsIdDto } from './dto/friends.dto';

@UseGuards(AvtorizationGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  private async getFriends(@Req() req: Request) {
    if (!req.user) {
      return { message: 'Не передана полезная нагрузка пользователя' };
    } else {
      const email = req.user;
      const findListFriends = await this.friendsService.getFriends(
        email.payload,
      );
      if (findListFriends) {
        return findListFriends;
      } else {
        throw new NotFoundException('Списка друзей не существует');
      }
    }
  }

  @Post()
  private async addFriend(@Body() payload: FriendsIdDto, @Req() req: Request) {
    if (!req.user) {
      return { message: 'Не передана полезная нагрузка пользователя' };
    } else {
      const email = req.user;
      const { id } = payload;
      const add = await this.friendsService.addFriend(email.payload, id);
      if (add) {
        return { message: 'Друг добавлен' };
      }

      return { message: 'Друг не добавлен' };
    }
  }

  @Delete()
  private async removeFriend(
    @Body() payload: FriendsIdDto,
    @Req() req: Request,
  ) {
    if (!req.user) {
      return { message: 'Не передана полезная нагрузка пользователя' };
    } else {
      const email = req.user;
      const { id } = payload;
      const remove = await this.friendsService.removeFriend(email.payload, id);

      if (remove) {
        return { message: 'Друг удален' };
      }

      return { message: 'Друг не удалось удалить' };
    }
  }
}
