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
  name: string;
  email: string;
}
