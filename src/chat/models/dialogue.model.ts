import mongoose from 'mongoose';
import { Dialogue } from '../../type/type';
import { MessageUser } from '../../type/type';
// Определение схемы диалога для MongoDB через Mongoose

export const MessageUserSchema = new mongoose.Schema<MessageUser>({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  message: {
    type: String,
    required: true,
  },

  date: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    required: true,
  },
});

export const DialogueSchema = new mongoose.Schema<Dialogue>({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  user1Id: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },

  user2Id: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },

  messages: {
    type: [MessageUserSchema],
    required: true,
  },
});
