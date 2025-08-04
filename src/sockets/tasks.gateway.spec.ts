import { Test, TestingModule } from '@nestjs/testing';
import { TasksGateway } from './tasks.gateway';
import { ConfigService } from '@nestjs/config';
import {
  createMockConfigService,
  createMockSocketServer,
  socketId,
} from 'test/mocks/sockets.mock';
import { mockTask } from 'test/mocks/tasks.mock';
import { ITask } from 'src/tasks/tasks.types';

describe('TasksGateway', () => {
  let gateway: TasksGateway;
  let emitEntityEventSpy: jest.SpyInstance;
  const task: ITask = mockTask();

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
    (gateway as any).server = createMockSocketServer();

    emitEntityEventSpy = jest.spyOn(gateway as any, 'emitEntityEvent');
  });

  const testCases: Array<{
    method: keyof TasksGateway;
    action: string;
  }> = [
    { method: 'emitTaskCreated', action: 'created' },
    { method: 'emitTaskUpdated', action: 'updated' },
    { method: 'emitTaskToggleStatus', action: 'toggleStatus' },
    { method: 'emitTaskDeleted', action: 'deleted' },
  ];

  testCases.forEach(({ method, action }) => {
    it(`should emit "task:${action}" via ${method}`, () => {
      (gateway[method] as any)(task, socketId);

      expect(emitEntityEventSpy).toHaveBeenCalledWith(
        'task',
        action,
        task,
        socketId,
      );
    });
  });
});
