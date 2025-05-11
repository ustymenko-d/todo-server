import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { BaseGateway } from './base.gateway';
import { Server } from 'socket.io';
import { ITask } from 'src/tasks/task.types';

@Injectable()
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class TasksGateway extends BaseGateway {
  @WebSocketServer()
  server: Server;

  emitTaskCreated(task: ITask, initiatorSocketId?: string) {
    this.emitToAllExceptInitiator('task:created', task, initiatorSocketId);
  }

  emitTaskUpdated(task: ITask, initiatorSocketId?: string) {
    this.emitToAllExceptInitiator('task:updated', task, initiatorSocketId);
  }

  emitTaskToggleStatus(task: ITask, initiatorSocketId?: string) {
    this.emitToAllExceptInitiator('task:toggleStatus', task, initiatorSocketId);
  }

  emitTaskDeleted(task: ITask, initiatorSocketId?: string) {
    this.emitToAllExceptInitiator('task:deleted', task, initiatorSocketId);
  }
}
