import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Socket, Server } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { ChatRedisService } from './chat.redis.service';
import { SocketChatListener, Client, PayloadId } from './type/type';

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

      if (element && !element.infoClient) {
        // если пользователь зайдет с другой страницы по тому же ид, присвоим его новому сокету
        element.infoClient = payload;
      }
    }
  }

  private async getCashDialogue(
    roomName: string,
    client: Socket,
  ): Promise<boolean> {
    const roomMessages = await this.chatRedisService.getRoomDialogue(roomName);
    if (roomMessages) {
      client.emit(SocketChatListener.GETCASHDIALOGUE, roomMessages);
      return true;
    } else {
      return false;
    }
  }

  private emitRoomMessages<M>(roomName: string, event: string, message: M) {
    this.server.to(roomName).emit(event, message);
  }

  @SubscribeMessage(SocketChatListener.STARTCHAT)
  private async startChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PayloadId,
  ) {
    const user1Id = this.clients.get(client.id)?.infoClient?.id;
    if (data && user1Id) {
      const user2Id = data.id; // проверяем, что данные не пустые
      const roomName = this.chatService.createRoomName(user1Id, user2Id); // создание имени комнаты
      const existingUser2 = Array.from(this.clients.values()).some(
        (client) => client.infoClient && client.infoClient.id === user2Id, // проверка есть ли в сети 2 пользователь, которому отправляем сообщение
      );

      if (!existingUser2) {
        // если пользователя с которым мы хотиим создать диалог нет в в сети, то комнату не создаем, а просто получаем кешироанные данные
        const existingCash = await this.getCashDialogue(roomName, client);
        if (!existingCash) {
          const messages = await this.chatService.getDialogue(roomName); // если кеша нет, то получаем из базы данных диалог либо создаем новый
          // если диалог не найден, то отправляем пустой массив
          if (!messages) {
            client.emit(SocketChatListener.GETCASHDIALOGUE, []);
            return; // завершаем функцию  если пустой массив
          } else {
            await this.chatRedisService.createRoomDialogue(roomName, messages); // если диалог найден, то записываем его в кеш, затем отправляем клиенту и завершаем функцию
            client.emit(SocketChatListener.GETCASHDIALOGUE, messages);
            return;
          }
        } else {
          return; // если кеш есть завершаем функцию
        }
      } else {
        // если второй пользователь в сети, добавляем обоих в общую комнату
        await client.join(roomName);
        //добавляем пользователя в комнату №1
        this.chatService.creeatePropertyRooms(
          roomName,
          user1Id,
          user2Id,
          this.clients.get(client.id)!,
        );
        for (const clientItem of this.clients.values()) {
          if (clientItem.infoClient && clientItem.infoClient.id === user2Id) {
            // добавляем пользователя в комнату №2
            this.chatService.creeatePropertyRooms(
              roomName,
              user2Id,
              user1Id,
              clientItem,
            );
            await clientItem.socket.join(roomName);
          }
        }

        const messages = await this.chatService.getDialogue(roomName); //получаем кешированные данные
        // если они есть, то отправляем участникам комнаты
        if (messages) {
          this.emitRoomMessages(
            roomName,
            SocketChatListener.GETCASHDIALOGUE,
            messages,
          );
          return;
        }
        // если их нет, то возвращаем пустой массив
        this.emitRoomMessages(roomName, SocketChatListener.GETCASHDIALOGUE, []);
        return;
      }
    } else {
      throw new WsException('Ошибка при создании диалога'); // если данные пустые, то выбрасываем ошибку
    }
  }
}
