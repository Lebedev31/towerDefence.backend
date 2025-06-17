import mongoose from 'mongoose';
import { GlobalMessagesDocument } from '../type/type';

export const GlobalMessagesSchema = new mongoose.Schema<GlobalMessagesDocument>(
  {
    parentid: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalMessage' }, // Ссылка на самого себя
    nameUser: { type: String, required: true },
    patchAvatar: { type: String, required: true },
    idUser: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    like: { type: Number, default: 0 },
    dislike: { type: Number, default: 0 },
  },
);

GlobalMessagesSchema.index({ parentid: 1, timestamp: -1 });
