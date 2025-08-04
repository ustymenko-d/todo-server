import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskBase, GetTasksRequest, Task } from './tasks.dto';
import { IGetTasksResponse } from './tasks.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { mockJwtUser } from 'test/mocks/auth.mock';
import {
  mockTask,
  mockTasksService,
  TTasksServiceMock,
} from 'test/mocks/tasks.mock';
import { mockPrisma } from 'test/mocks/prisma.mock';
import { socketId } from 'test/mocks/sockets.mock';
import { expectThrows } from 'test/utils/expectThrows';
import { expectSuccess } from 'test/utils/expectSuccess';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TTasksServiceMock;

  const newTaskDto: TaskBase = { title: 'New Task' };
  const getRequest: GetTasksRequest = { page: 1, limit: 10 };
  const editedTask: Task = mockTask({ title: 'Edited task' });
  const toggledTask = mockTask({ completed: true });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useFactory: mockTasksService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get(TasksController);
    service = module.get(TasksService);
  });

  describe('create()', () => {
    it('returns created task', async () => {
      const task = mockTask();
      service.createTask.mockResolvedValueOnce(task);

      const result = await controller.create(
        { user: mockJwtUser },
        newTaskDto,
        socketId,
      );

      expect(service.createTask).toHaveBeenCalledWith(
        { ...newTaskDto, userId: mockJwtUser.userId },
        socketId,
      );
      expect(result).toEqual(
        expectSuccess<Task>('Task created successfully.', task, 'task'),
      );
    });

    it('throws when service fails', async () => {
      service.createTask.mockRejectedValueOnce(new Error('Error'));
      await expectThrows(() =>
        controller.create({ user: mockJwtUser }, newTaskDto, socketId),
      );
    });
  });

  describe('get()', () => {
    const response: IGetTasksResponse = {
      tasks: [],
      page: getRequest.page,
      limit: getRequest.limit,
      total: 0,
      pages: 0,
    };

    it('returns paginated list', async () => {
      service.getTasks.mockResolvedValueOnce(response);

      const result = await controller.get({ user: mockJwtUser }, getRequest);

      expect(service.getTasks).toHaveBeenCalledWith({
        ...getRequest,
        userId: mockJwtUser.userId,
      });
      expect(result).toEqual(response);
    });

    it('throws when service fails', async () => {
      service.getTasks.mockRejectedValueOnce(new Error('Error'));
      await expectThrows(() =>
        controller.get({ user: mockJwtUser }, getRequest),
      );
    });
  });

  describe('edit()', () => {
    it('returns updated task', async () => {
      service.editTask.mockResolvedValueOnce(editedTask);

      const result = await controller.edit(editedTask, socketId);

      expect(service.editTask).toHaveBeenCalledWith(editedTask, socketId);
      expect(result).toEqual(
        expectSuccess<Task>('Task edited successfully.', editedTask, 'task'),
      );
    });

    it('throws when service fails', async () => {
      service.editTask.mockRejectedValueOnce(new Error('Error'));
      await expectThrows(() => controller.edit(editedTask, socketId));
    });
  });

  describe('toggleStatus()', () => {
    it('toggles and returns task', async () => {
      service.toggleStatus.mockResolvedValueOnce(toggledTask);

      const result = await controller.toggleStatus(
        { taskId: toggledTask.id },
        socketId,
      );

      expect(service.toggleStatus).toHaveBeenCalledWith(
        toggledTask.id,
        socketId,
      );
      expect(result).toEqual(
        expectSuccess<Task>(
          'Task status changed successfully.',
          toggledTask,
          'task',
        ),
      );
    });

    it('throws when service fails', async () => {
      service.toggleStatus.mockRejectedValueOnce(new Error('Error'));
      await expectThrows(() =>
        controller.toggleStatus({ taskId: toggledTask.id }, socketId),
      );
    });
  });

  describe('delete()', () => {
    it('deletes and returns task', async () => {
      service.deleteTask.mockResolvedValueOnce(toggledTask);

      const result = await controller.delete(
        { taskId: toggledTask.id },
        socketId,
      );

      expect(service.deleteTask).toHaveBeenCalledWith(toggledTask.id, socketId);
      expect(result).toEqual(
        expectSuccess<Task>('Task deleted successfully.', toggledTask, 'task'),
      );
    });

    it('throws when service fails', async () => {
      service.deleteTask.mockRejectedValueOnce(new Error('Error'));
      await expectThrows(() =>
        controller.delete({ taskId: toggledTask.id }, socketId),
      );
    });
  });
});
