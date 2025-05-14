import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Socket, Server } from 'socket.io';
import { Injectable } from '@nestjs/common';

export type Client = {
  id: string;
  socket: Socket;
  infoClient?: {
    id: string;
    name: string;
  };
};

export enum SocketChatListener {
  GETCHATLIST = 'getChatList',
  PESRSONALDATA = 'personalData',
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
  constructor(private readonly chatService: ChatService) {}
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

  private getOtherClients(currentId: string) {
    return Array.from(this.clients.values())
      .filter((client) => client.infoClient && client.id !== currentId)
      .map((client) => client.infoClient);
  }

  // Отправить всем актуальный список (каждому — без него самого)
  private broadcastClientsList() {
    for (const [id, client] of this.clients.entries()) {
      if (client.infoClient) {
        const others = this.getOtherClients(id);
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
    if (element && !element.infoClient) {
      element.infoClient = payload;
      this.broadcastClientsList();
    } else {
      // Отправить только этому клиенту список других
      client.emit(SocketChatListener.GETCHATLIST, this.getOtherClients(id));
    }
  }
}
