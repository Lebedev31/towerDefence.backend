import { Document } from 'mongoose';

export interface Auth extends Document {
  email: string;
  password: string;
}

export interface Friend {
  id: string;
  name: string;
}

export interface User extends Auth {
  // Пользователь
  name: string;
  email: string;
  password: string;
  friends: Friend[];
}

export interface UserPublicData {
  // Публичные данные пользователя
  email: string;
  name: string;
}
export interface AuthPublicData {
  id: string;
  name: string;
}

export interface EnvConfig {
  MONGODB_URI: string;
  PORT: string;
  FRONTEND_URL: string;
  JWT_SECRET_REFRESH: string;
  JWT_SECRET_ACCESS: string;
  REDIS_URL: string;
  MESSAGE_CASH_LIMIT: string;
  RESIS_TTL_DIALOGUE: string;
}

export interface MessageClient {
  message: any;
}
