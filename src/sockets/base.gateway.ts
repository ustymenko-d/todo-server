import { WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BaseGateway {
  @WebSocketServer()
  server: Server;

  emitToAllExceptInitiator(
    event: string,
    data: any,
    initiatorSocketId?: string,
  ): void {
    const socketToExclude = initiatorSocketId || '';
    this.server.except(socketToExclude).emit(event, data);
  }
}
