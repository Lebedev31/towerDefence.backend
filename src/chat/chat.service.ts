import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../type/type';

@Injectable()
export class ChatService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}
}
