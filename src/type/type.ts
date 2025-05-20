import { Document } from 'mongoose';

export interface Auth extends Document {
  email: string;
  password: string;
}
export interface User extends Auth {
  // Пользователь
  name: string;
  email: string;
  password: string;
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
}

export interface MessageClient {
  message: any;
}

export interface MessageUser extends Document {
  id: string;
  message: string;
  date: Date;
  isRead: boolean;
}

export interface Dialogue extends Document {
  id: string;
  user1Id: string;
  user2Id: string;
  messages: MessageUser[];
}
