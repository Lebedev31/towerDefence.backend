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
import { MessageUserPayload } from './type/type';

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

  // Ключ - id пользователя из БД, значение - объект Client
  private clients = new Map<string, Client[]>();

  @WebSocketServer()
  private server: Server;

  private handleConnection(client: Socket) {
    console.log(`Клиент подключился: ${client.id}`);
    // Регистрация произойдет только после получения персональных данных
  }

  private handleDisconnect(client: Socket) {
    const socketId = client.id;

    // Ищем пользователя по socketId во всех записях
    for (const [userId, clientConnections] of this.clients.entries()) {
      const connectionIndex = clientConnections.findIndex(
        (c) => c.socket.id === socketId,
      );

      if (connectionIndex !== -1) {
        // Удаляем соединение из массива
        clientConnections.splice(connectionIndex, 1);

        // Если у пользователя больше нет активных соединений, удаляем его из Map
        if (clientConnections.length === 0) {
          this.clients.delete(userId);
        }

        console.log(`Клиент отключился: ${socketId}, пользователь: ${userId}`);
        break;
      }
    }

    this.broadcastClientsList();
  }

  private getOtherClients(currentUserId: string) {
    // Создаем массив уникальных пользователей
    const uniqueUsers = new Set<string>();
    const result: Array<{ id: string; name: string }> = [];

    for (const [userId, clientConnections] of this.clients.entries()) {
      // Пропускаем текущего пользователя
      if (userId === currentUserId || clientConnections.length === 0) {
        continue;
      }

      // Добавляем только уникальных пользователей
      if (!uniqueUsers.has(userId)) {
        uniqueUsers.add(userId);
        result.push(clientConnections[0].infoClient!);
      }
    }

    return result;
  }

  // Отправить всем актуальный список (каждому — без него самого)
  private broadcastClientsList() {
    for (const [userId, clientConnections] of this.clients.entries()) {
      // Для каждого соединения текущего пользователя
      for (const client of clientConnections) {
        const others = this.getOtherClients(userId);
        client.socket.emit(SocketChatListener.GETCHATLIST, others);
      }
    }
  }

  @SubscribeMessage(SocketChatListener.PESRSONALDATA)
  private async setPersonalData(@ConnectedSocket() client: Socket) {
    const socketId = client.id;
    const token = client.handshake.auth.token as string;
    const payload = await this.chatService.getInfoClient(token);

    if (!payload || !payload.id) {
      throw new WsException('Недействительные данные пользователя');
    }

    const userId = String(payload.id);

    // Создаем новое соединение для пользователя
    const newClient: Client = {
      id: socketId,
      socket: client,
      infoClient: payload,
    };

    // Если у пользователя уже есть соединения, добавляем новое
    if (this.clients.has(userId)) {
      this.clients.get(userId)!.push(newClient);
    } else {
      // Иначе создаем новую запись
      this.clients.set(userId, [newClient]);
    }

    console.log(`Клиент авторизован: ${socketId}, пользователь: ${userId}`);

    // Отправляем пользователю список других пользователей
    client.emit(SocketChatListener.GETCHATLIST, this.getOtherClients(userId));

    // Уведомляем всех об обновлении списка пользователей
    this.broadcastClientsList();
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

  // Вспомогательный метод для получения userId по socketId
  private getUserIdBySocketId(socketId: string): string | null {
    for (const [userId, clientConnections] of this.clients.entries()) {
      if (clientConnections.some((c) => c.socket.id === socketId)) {
        return userId;
      }
    }
    return null;
  }

  // вспомогаетльный метод для отправки кешированых данных, если кому пишут нет в сети
  private async sendCachedOfflineMessages(roomName: string, client: Socket) {
    // Если пользователя нет в сети, получаем кешированные данные
    const existingCash = await this.getCashDialogue(roomName, client);

    if (!existingCash) {
      const messages = await this.chatService.getDialogue(roomName);

      if (!messages) {
        client.emit(SocketChatListener.GETCASHDIALOGUE, []);
      } else {
        await this.chatRedisService.createRoomDialogue(roomName, messages);
        client.emit(SocketChatListener.GETCASHDIALOGUE, messages);
      }
    }
  }

  // вспомогательный метод для создания комнаты, если оба пользователя в сети
  private async createRoomIfBothOnline(
    client: Socket,
    roomName: string,
    userId: string,
    user2Id: string,
  ) {
    // Если второй пользователь в сети, добавляем обоих в общую комнату
    await client.join(roomName);

    // Добавляем свойство комнаты к текущему клиенту
    const clientConnections = this.clients.get(userId)!;
    const currentClient = clientConnections.find(
      (c) => c.socket.id === client.id,
    )!;

    this.chatService.creeatePropertyRooms(
      roomName,
      userId,
      user2Id,
      currentClient,
    );

    // Для второго пользователя подключаем все его сокеты к комнате
    const user2Connections = this.clients.get(user2Id) || [];
    for (const user2Client of user2Connections) {
      this.chatService.creeatePropertyRooms(
        roomName,
        userId,
        user2Id,
        currentClient,
      );
      await user2Client.socket.join(roomName);
    }

    // Получаем диалог и отправляем участникам
    const messages = await this.chatService.getDialogue(roomName);

    if (messages) {
      this.emitRoomMessages(
        roomName,
        SocketChatListener.GETCASHDIALOGUE,
        messages,
      );
    } else {
      this.emitRoomMessages(roomName, SocketChatListener.GETCASHDIALOGUE, []);
    }
  }

  @SubscribeMessage(SocketChatListener.STARTCHAT)
  private async startChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PayloadId,
  ) {
    const userId = this.getUserIdBySocketId(client.id);

    if (!userId || !data) {
      throw new WsException('Ошибка при создании диалога');
    }

    const user2Id = String(data.id);
    const roomName = this.chatService.createRoomName(userId, user2Id);

    // Проверяем, есть ли пользователь 2 в сети
    const user2Online = this.clients.has(user2Id);

    if (!user2Online) {
      await this.sendCachedOfflineMessages(roomName, client);
    } else {
      await this.createRoomIfBothOnline(client, roomName, userId, user2Id);
    }
  }

  @SubscribeMessage(SocketChatListener.SENDMESSAGE)
  private async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MessageUserPayload,
  ) {
    const userId = this.getUserIdBySocketId(client.id);

    if (!userId || !data || !data.message) {
      throw new WsException('Ошибка при отправке сообщения');
    }

    const recipientId = String(data.message.id);
    const roomName = this.chatService.createRoomName(userId, recipientId);

    const existingRoom = await this.chatRedisService.getRoomDialogue(roomName);

    if (!existingRoom) {
      // Если комнаты нет в кеше, проверяем базу данных
      const findMessages = await this.chatService.getDialogue(roomName);

      if (!findMessages) {
        // Создаем новый диалог
        const createDialog = await this.chatService.createDialogue(
          userId,
          recipientId,
          [data.message],
        );

        await this.chatRedisService.createRoomDialogue(
          roomName,
          createDialog.messages,
        );

        const user2Online = this.clients.has(data.message.id);
        if (!user2Online) {
          await this.sendCachedOfflineMessages(roomName, client);
        } else {
          await this.createRoomIfBothOnline(
            client,
            roomName,
            userId,
            data.message.id,
          );
        }
      } else {
        // если диалог уже существует, то добавляем собщение в кеш, и
      }
    }
  }
}
