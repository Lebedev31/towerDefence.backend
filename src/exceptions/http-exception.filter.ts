import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';
import mongoose from 'mongoose'; // Импортируем библиотеку Mongoose

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const now = new Date().toISOString();
    const path = request.url;

    let status: HttpStatus;
    let message: string | object;

    if (exception instanceof HttpException) {
      // Обработка стандартных HTTP-исключений NestJS
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof mongoose.Error.ValidationError) {
      // Обработка ошибок валидации Mongoose
      status = HttpStatus.BAD_REQUEST;
      message = {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Ошибка валидации',
      };
    } else if (exception instanceof mongoose.Error.CastError) {
      // Обработка ошибок приведения типов Mongoose (например, невалидный ObjectId)
      status = HttpStatus.BAD_REQUEST;
      message = {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Некорректный формат данных',
        details: exception.message,
      };
    } else if (exception instanceof MongoError) {
      // Обработка ошибок MongoDB
      switch (exception.code) {
        case 11000: // Код ошибки для дублирующегося ключа
          status = HttpStatus.CONFLICT;
          message = {
            statusCode: HttpStatus.CONFLICT,
            message: 'Конфликт: запись с такими данными уже существует',
            details: exception.message,
          };
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Ошибка базы данных',
            details: exception.message,
          };
          break;
      }
    } else if (exception instanceof Error) {
      // Обработка стандартных ошибок JavaScript
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Внутренняя ошибка сервера',
        details: exception.message,
      };
    } else {
      // Обработка всех остальных необработанных исключений
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Непредвиденная ошибка',
      };
    }

    const errorResponse = {
      statusCode: status,
      timestamp: now,
      path: path,
      message: message,
    };

    response.status(status).json(errorResponse);
  }
}
