import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, Dialogue } from '../type/type';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '../type/type';
import { ChatService } from './chat.service';
import * as redis from 'redis';

interface RedisStore {
  getClient: () => redis.RedisClientType;
}

@Injectable()
export class ChatRedisService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Dialogue') private readonly dialogueModel: Model<Dialogue>,
    private readonly configService: ConfigService<EnvConfig>,
    private readonly chatService: ChatService,
  ) {}

  getRedisClient() {
    const [store] = this.cacheManager.stores as unknown as RedisStore[];
    return store.getClient();
  }
}
