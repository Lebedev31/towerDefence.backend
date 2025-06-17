import mongoose from 'mongoose';
import { User } from '../type/type';

// Определение схемы пользователя для MongoDB через Mongoose
export const userSchema = new mongoose.Schema<User>({
  // Имя пользователя: обязательное, строка, удаляются пробелы по краям
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // Email пользователя: обязательное, уникальное, строка, удаляются пробелы, приводится к нижнему регистру
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  // Пароль пользователя: обязательное поле, строка
  password: {
    type: String,
    required: true,
  },
  // Массив друзей пользователя
  friends: [
    {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
  ],
});
