import { Document, Types } from 'mongoose';
import { Socket } from 'socket.io';

/*
  Интерфейс Client описывает подключённого клиента через WebSocket.
  Поля:
  - id: уникальный идентификатор подключения (обычно socket id).
  - socket: объект сокета (Socket) из socket.io.
  - infoClient (необязательное): объект с информацией о пользователе,
    содержащий поля id (идентификатор пользователя) и name (имя пользователя).
  - room (необязательное): объект информации о комнате (диалоге),
    содержащий roomName (название комнаты),
    user1Id (идентификатор первого участника) и user2Id (идентификатор второго участника).
*/
export interface Client {
  id: string;
  socket: Socket;
  infoClient?: {
    id: string;
    name: string;
  };
  room?: {
    roomName: string;
    user1Id: string;
    user2Id: string;
  };
}

/*
  Перечисление SocketChatListener определяет имена событий,
  используемых в чате:
  - GETCHATLIST: событие получения обновленного списка чатов/клиентов.
  - PESRSONALDATA: событие передачи личных данных клиента.
  - STARTCHAT: событие для запуска диалога.
*/
export enum SocketChatListener {
  GETCHATLIST = 'getChatList',
  PESRSONALDATA = 'personalData',
  STARTCHAT = 'startChat',
  GETCASHDIALOGUE = 'getCashDialogue',
  SENDMESSAGE = 'sendMessage',
  GETGLOBALIST = 'getGlobalList',
}

/*
  Интерфейс MessageUser расширяет Document Mongoose и описывает сообщение в чате.
  Содержит:
  - id: идентификатор сообщения.
  - message: текст сообщения.
  - date: дата и время создания сообщения.
  - isRead: флаг, показывающий, было ли сообщение прочитано.
*/
export interface Message {
  id: string;
  message: string;
  date: Date;
  isRead: boolean;
}

export type MessageUser = Message & Document;

/*
  Интерфейс Dialogue расширяет Document Mongoose и описывает диалог между двумя пользователями.
  Содержит:
  - id: идентификатор диалога.
  - user1Id: идентификатор первого участника.
  - user2Id: идентификатор второго участника.
  - messages: массив сообщений, относящихся к данному диалогу.
*/
export interface Dialogue extends Document {
  id: string;
  user1Id: string;
  user2Id: string;
  messages: MessageUser[];
}

/*
  Интерфейс PayloadId используется для передачи идентификатора в качестве данных.
  Содержит:
  - id: идентификатор.
*/
export interface PayloadId {
  id: string;
}

export interface RedisRoomChat {
  messageArr1: Message[];
  messageArr2: Message[];
}

export interface MessageUserPayload {
  message: Message;
}

/// типы для глобального чата
// глобальное сообшение в чате
//
export interface GlobalMessages {
  nameUser: string;
  patchAvatar: string;
  idUser: string;
  answers?: string;
  timestamp: Date;
  like: number;
  dislike: number;
  text: string;
  parentid?: Types.ObjectId;
}
// документ для монго
export type GlobalMessagesDocument = GlobalMessages & Document;

/*
 интерфейс двухуровневого кеша в глобальном чате
*/
// глобальная ветка сообщения с рекурсивным типом
export type GlobalMessagesCash = GlobalMessages & {
  messages?: GlobalMessages[];
};

export interface GlobalMessageCashRoom {
  messageArr1: GlobalMessagesCash[];
  messageArr2: GlobalMessagesCash[];
}
