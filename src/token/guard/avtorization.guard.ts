import {
  CanActivate,
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../token.service';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { TokenExpiredError } from '@nestjs/jwt';

@Injectable()
export class AvtorizationGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const authHeader = request.headers['authorization'] as string;
    const cookieToken = request.cookies['token'] as string; // Если используешь куки
    const token = authHeader.split(' ')[1];
    let flag = false;

    try {
      this.tokenService.verifyToken(token, false);
      return true;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        flag = true;
      } else {
        throw new UnauthorizedException('Токен недействителен');
      }
    }

    if (flag) {
      try {
        const verife = this.tokenService.verifyToken(cookieToken, true);
        const newAccessToken = this.tokenService.createAccessToken(
          verife.payload,
        );
        this.tokenService.setAuthorization(response, newAccessToken);
        return true;
      } catch (error) {
        if (error instanceof Error) {
          throw new UnauthorizedException(
            'Невалидный или просроченный токен обновления',
          );
        }
      }
    }

    return false;
  }
}
