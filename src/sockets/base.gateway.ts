import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebSocketServer } from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';

@Injectable()
export abstract class BaseGateway implements OnModuleInit {
  @WebSocketServer()
  protected server: Server;

  constructor(protected readonly configService: ConfigService) {}

  onModuleInit() {
    const origin = this.configService.get<string>('FRONTEND_URL') ?? '*';

    this.server.engine.on('initial_headers', (headers) => {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    });
  }

  protected emitToAllExceptInitiator<T>(
    event: string,
    data: T,
    initiatorSocketId?: string,
  ) {
    if (initiatorSocketId) {
      this.server.except(initiatorSocketId).emit(event, data);
    } else {
      this.server.emit(event, data);
    }
  }

  protected emitEntityEvent<T>(
    entity: string,
    action: string,
    payload: T,
    initiatorSocketId?: string,
  ) {
    const event = `${entity}:${action}`;
    this.emitToAllExceptInitiator(event, payload, initiatorSocketId);
  }
}
