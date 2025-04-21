import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';
import mongoose from 'mongoose';

// Функция-помощник для безопасного получения сообщения об ошибке
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    // Если даже stringify не удался
    return `[Unserializable error: ${Object.prototype.toString.call(error)}]`;
  }
}

// Функция-помощник для безопасного получения стека ошибки
function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  // Некоторые не-Error объекты тоже могут иметь stack
  if (
    typeof error === 'object' &&
    error !== null &&
    'stack' in error &&
    typeof error.stack === 'string'
  ) {
    return error.stack;
  }
  return undefined;
}

@Catch() // Catches everything, exception type is implicitly 'unknown' or 'any'
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  // Обрабатываем exception как unknown для максимальной безопасности
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const now = new Date().toISOString();
    const path = request.url;

    // --- Инициализация и безопасное извлечение данных ---
    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR; // Инициализация обязательна
    // Используем функции-помощники для безопасного извлечения
    const internalErrorMessage = getErrorMessage(exception);
    const stack = getErrorStack(exception);

    // --- Логгирование ---
    this.logger.error(
      `Caught Exception: Status [${status}] Path [${request.method} ${path}] Msg [${internalErrorMessage}]`,
      // Передаем стек, если он был извлечен
      stack, // Безопасно передавать undefined
      AllExceptionsFilter.name,
    );

    let responseMessage: string | object; // Сообщение для ответа клиенту

    // --- Определение КОНКРЕТНОГО статуса и сообщения для ответа ---
    // Используем instanceof для сужения типа 'unknown'
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      // Проверяем структуру ответа HttpException
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        responseMessage = exceptionResponse;
      } else {
        // Формируем стандартный ответ, если getResponse() вернул строку или что-то иное
        responseMessage = {
          statusCode: status,
          message: exceptionResponse,
          // Добавляем details только если оригинальное сообщение отличается
          ...(internalErrorMessage &&
            exceptionResponse !== internalErrorMessage && {
              details: internalErrorMessage,
            }),
        };
      }
    } else if (exception instanceof mongoose.Error.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      // Безопасно получаем сообщения об ошибках валидации
      const validationErrors = Object.values(exception.errors).map((err) =>
        getErrorMessage(err),
      );
      responseMessage = {
        statusCode: status,
        message: 'Ошибка валидации',
        details:
          validationErrors.length > 0 ? validationErrors : internalErrorMessage,
      };
    } else if (exception instanceof mongoose.Error.CastError) {
      status = HttpStatus.BAD_REQUEST;
      responseMessage = {
        statusCode: status,
        message: 'Некорректный формат данных',
        // exception.path безопасно, т.к. мы внутри блока instanceof CastError
        details: `Поле '${exception.path}': ${internalErrorMessage}`,
      };
    } else if (exception instanceof MongoError) {
      let userMessage = 'Ошибка базы данных';
      // exception.code безопасно внутри этого блока
      if (exception.code === 11000) {
        status = HttpStatus.CONFLICT;
        userMessage = 'Конфликт: запись с такими данными уже существует';
      }
      // Другие коды MongoError...
      responseMessage = {
        statusCode: status, // Либо CONFLICT, либо дефолтный 500
        message: userMessage,
        details: internalErrorMessage, // Оригинальное сообщение от MongoDB
      };
    } else if (exception instanceof Error) {
      // Общий Error, статус уже 500
      responseMessage = {
        statusCode: status,
        message: 'Внутренняя ошибка сервера',
        details: internalErrorMessage,
      };
    } else {
      // Все остальное, статус уже 500
      responseMessage = {
        statusCode: status,
        message: 'Непредвиденная ошибка',
        details: internalErrorMessage, // Уже извлечено как могли
      };
    }

    // --- Формирование финального ответа ---
    const errorResponse = {
      statusCode: status,
      timestamp: now,
      path: path,
      // Аккуратно собираем ответ
      ...(typeof responseMessage === 'object'
        ? responseMessage
        : { message: responseMessage }),
    };

    response.status(status).json(errorResponse);
  }
}
