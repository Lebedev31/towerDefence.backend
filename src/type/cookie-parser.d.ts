import 'express';
import { JwtPayload } from '../token/token.service';

declare function cookieParser(
  secret: string | string[],
  options?: CookieParserOptions,
): RequestHandler;

// Расширяем интерфейс Request из модуля 'express'
declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}
