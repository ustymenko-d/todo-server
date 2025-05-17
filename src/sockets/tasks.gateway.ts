import { Injectable } from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import { BaseGateway } from './base.gateway';
import { ITask } from 'src/tasks/tasks.types';
import { ConfigService } from '@nestjs/config';

@Injectable()
@WebSocketGateway()
export class TasksGateway extends BaseGateway {
  constructor(configService: ConfigService) {
    super(configService);
  }

  emitTaskCreated(task: ITask, initiatorSocketId?: string) {
    this.emitEntityEvent<ITask>('task', 'created', task, initiatorSocketId);
  }

  emitTaskUpdated(task: ITask, initiatorSocketId?: string) {
    this.emitEntityEvent<ITask>('task', 'updated', task, initiatorSocketId);
  }

  emitTaskToggleStatus(task: ITask, initiatorSocketId?: string) {
    this.emitEntityEvent<ITask>(
      'task',
      'toggleStatus',
      task,
      initiatorSocketId,
    );
  }

  emitTaskDeleted(task: ITask, initiatorSocketId?: string) {
    this.emitEntityEvent<ITask>('task', 'deleted', task, initiatorSocketId);
  }
}
