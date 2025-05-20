import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Socket, Server } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { ChatRedisService } from './chat.redis.service';

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

export enum SocketChatListener {
  GETCHATLIST = 'getChatList',
  PESRSONALDATA = 'personalData',
  STARTCHAT = 'startChat',
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transport: ['websocket', 'polling'],
  namespace: '/chat',
})
@Injectable()
export class ChatGateway {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatRedisService: ChatRedisService,
  ) {}
  private clients = new Map<string, Client>();
  @WebSocketServer()
  private server: Server;

  private handleConnection(client: Socket) {
    this.clients.set(client.id, {
      id: client.id,
      socket: client,
    });
    console.log(`Клиент подключился: ${client.id}`);
  }

  private handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
    console.log(`Клиент отключился: ${client.id}`);
    this.broadcastClientsList();
  }

  private getOtherClients(currentClientId: string, currentUserId: string) {
    return Array.from(this.clients.values())
      .filter((client) => {
        // Отфильтровываем текущего клиента И любых клиентов с таким же userId
        return (
          client.infoClient &&
          client.id !== currentClientId &&
          String(client.infoClient.id) !== String(currentUserId)
        );
      })
      .map((client) => client.infoClient);
  }

  // Отправить всем актуальный список (каждому — без него самого)
  private broadcastClientsList() {
    for (const [id, client] of this.clients.entries()) {
      if (client.infoClient) {
        const userId = client.infoClient.id;
        const others = this.getOtherClients(id, userId);
        console.log(others);
        client.socket.emit(SocketChatListener.GETCHATLIST, others);
      }
    }
  }

  @SubscribeMessage(SocketChatListener.PESRSONALDATA)
  private async setPersonalData(@ConnectedSocket() client: Socket) {
    const id = client.id;
    const token = client.handshake.auth.token as string;
    const element = this.clients.get(id);
    const payload = await this.chatService.getInfoClient(token);
    const duplicateExists = Array.from(this.clients.values())
      // Исключаем текущего клиента
      .filter((client) => client.id !== id)
      // Проверяем, что у клиента уже установлен infoClient и приводим оба идентификатора к строке
      .some(
        (client) =>
          client.infoClient &&
          String(client.infoClient.id) === String(payload.id),
      );
    if (element && !element.infoClient && !duplicateExists) {
      element.infoClient = payload;
      this.broadcastClientsList();
    } else {
      const userId = payload.id;
      client.emit(
        SocketChatListener.GETCHATLIST,
        this.getOtherClients(id, userId),
      );
    }
  }

  @SubscribeMessage(SocketChatListener.STARTCHAT)
  private startChat(@ConnectedSocket() client: Socket) {
    console.log(client.id);
    const redisClient = this.chatRedisService.getRedisClient();
    console.log(redisClient);
  }
}
