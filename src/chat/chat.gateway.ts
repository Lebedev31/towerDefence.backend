import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

type Client = {
  id: string;
  socket: Socket;
};

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

  handleConnection(client: Socket) {
    this.clients.set(client.id, {
      id: client.id,
      socket: client,
    });
    console.log(this.clients);
    console.log(`Клиент подключился: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
    console.log(`Клиент отключился: ${client.id}`);
  }

  @SubscribeMessage('getChatList')
  getChatList(): void {
    const listClients = Object.values(this.clients) as Client[];
    this.server.emit('getChatList', listClients);
  }
}
