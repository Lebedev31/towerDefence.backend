import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AvtorizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authHaeder = req.headers['authorization'];
    const cookie = req.cookies['token'] as string | undefined;
    if (authHaeder && cookie) {
      next();
    } else {
      throw new UnauthorizedException('Нет токенов');
    }
  }
}
