import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { BaseGateway } from './base.gateway';
import { Server } from 'socket.io';
import { IFolder } from 'src/folders/folders.types';

@Injectable()
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class FoldersGateway extends BaseGateway {
  @WebSocketServer()
  server: Server;

  emitFolderCreated(folder: IFolder, initiatorSocketId?: string): void {
    this.emitToAllExceptInitiator('folder:created', folder, initiatorSocketId);
  }

  emitFolderRenamed(folder: IFolder, initiatorSocketId?: string): void {
    this.emitToAllExceptInitiator('folder:renamed', folder, initiatorSocketId);
  }

  emitFolderDeleted(folder: IFolder, initiatorSocketId?: string): void {
    this.emitToAllExceptInitiator('folder:deleted', folder, initiatorSocketId);
  }
}
