import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { AuthPublicData } from '../type/type';

type Client = {
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
})
export class ChatGateway {
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
  }

  private getListClients() {
    const clients = Array.from(this.clients.values())
      .filter((obj) => obj.infoClient !== undefined)
      .map((client) => client.infoClient);
    this.server.emit(SocketChatListener.GETCHATLIST, clients);
  }

  @SubscribeMessage(SocketChatListener.PESRSONALDATA)
  private setPersonalData(
    @MessageBody() payload: AuthPublicData,
    @ConnectedSocket() client: Socket,
  ) {
    const id = client.id;
    const element = this.clients.get(id);
    if (element) {
      element.infoClient = payload;
      this.getListClients();
    } else {
      client.emit(SocketChatListener.GETCHATLIST, {
        message: { success: false },
      });
    }
  }
}
