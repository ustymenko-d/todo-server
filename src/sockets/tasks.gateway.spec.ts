import { Test, TestingModule } from '@nestjs/testing';
import { TasksGateway } from './tasks.gateway';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import {
  createMockConfigService,
  createMockSocketServer,
} from 'test/mocks/sockets.mock';
import { mockTask } from 'test/mocks/tasks.mock';

describe('TasksGateway', () => {
  let gateway: TasksGateway;
  let emitEntityEventSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksGateway,
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
    }).compile();

    gateway = module.get<TasksGateway>(TasksGateway);
    (gateway as any).server = createMockSocketServer() as Server;

    emitEntityEventSpy = jest.spyOn<any, any>(gateway, 'emitEntityEvent');
  });

  const task = mockTask();

  describe('emitTaskCreated', () => {
    it('should emit "task:created" event', () => {
      gateway.emitTaskCreated(task, 'socket-id');
      expect(emitEntityEventSpy).toHaveBeenCalledWith(
        'task',
        'created',
        task,
        'socket-id',
      );
    });
  });

  describe('emitTaskUpdated', () => {
    it('should emit "task:updated" event', () => {
      gateway.emitTaskUpdated(task, 'socket-id');
      expect(emitEntityEventSpy).toHaveBeenCalledWith(
        'task',
        'updated',
        task,
        'socket-id',
      );
    });
  });

  describe('emitTaskToggleStatus', () => {
    it('should emit "task:toggleStatus" event', () => {
      gateway.emitTaskToggleStatus(task, 'socket-id');
      expect(emitEntityEventSpy).toHaveBeenCalledWith(
        'task',
        'toggleStatus',
        task,
        'socket-id',
      );
    });
  });

  describe('emitTaskDeleted', () => {
    it('should emit "task:deleted" event', () => {
      gateway.emitTaskDeleted(task, 'socket-id');
      expect(emitEntityEventSpy).toHaveBeenCalledWith(
        'task',
        'deleted',
        task,
        'socket-id',
      );
    });
  });
});
