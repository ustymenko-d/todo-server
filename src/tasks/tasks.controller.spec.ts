import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskBase, GetTasksRequest, Task } from './tasks.dto';
import { IGetTasksResponse } from './tasks.types';
import { DatabaseService } from 'src/database/database.service';
import { mockJwtUser } from 'test/mocks/user.mock';
import { mockTask, mockTasksService } from 'test/mocks/tasks.mock';

describe('TasksController', () => {
  let controller: TasksController;
  let service: ReturnType<typeof mockTasksService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useFactory: mockTasksService },
        {
          provide: DatabaseService,
          useValue: { task: { findUnique: jest.fn() } },
        },
      ],
    }).compile();

    controller = module.get(TasksController);
    service = module.get(TasksService);
  });

  const socketId = 'socket-id';

  describe('create()', () => {
    const body: TaskBase = { title: 'New Task' };

    it('should return created task', async () => {
      const task = mockTask();
      service.createTask.mockResolvedValueOnce(task);

      const result = await controller.create(
        { user: mockJwtUser },
        body,
        socketId,
      );

      expect(service.createTask).toHaveBeenCalledWith(
        { ...body, userId: mockJwtUser.userId },
        socketId,
      );
      expect(result).toEqual({ success: true, task });
    });

    it('should throw when service fails', async () => {
      service.createTask.mockRejectedValueOnce(new Error('Error'));

      await expect(
        controller.create({ user: mockJwtUser }, body, socketId),
      ).rejects.toThrow('Error');
    });
  });

  describe('get()', () => {
    const payload: GetTasksRequest = { page: 1, limit: 10 };
    const response: IGetTasksResponse = {
      tasks: [],
      page: 1,
      limit: 10,
      total: 0,
      pages: 0,
    };

    it('should return paginated task list', async () => {
      service.getTasks.mockResolvedValueOnce(response);

      const result = await controller.get({ user: mockJwtUser }, payload);

      expect(service.getTasks).toHaveBeenCalledWith({
        ...payload,
        userId: mockJwtUser.userId,
      });
      expect(result).toEqual(response);
    });
  });

  describe('edit()', () => {
    const editedTask: Task = {
      id: '1',
      title: 'Edited',
      userId: mockJwtUser.userId,
    };

    it('should return updated task', async () => {
      service.editTask.mockResolvedValueOnce(editedTask);

      const result = await controller.edit(editedTask, socketId);

      expect(service.editTask).toHaveBeenCalledWith(editedTask, socketId);
      expect(result).toEqual({ success: true, task: editedTask });
    });
  });

  describe('toggleStatus()', () => {
    const task = mockTask({ completed: true });

    it('should toggle task status', async () => {
      service.toggleStatus.mockResolvedValueOnce(task);

      const result = await controller.toggleStatus(
        { taskId: task.id },
        socketId,
      );

      expect(service.toggleStatus).toHaveBeenCalledWith(task.id, socketId);
      expect(result).toEqual({ success: true, task });
    });
  });

  describe('delete()', () => {
    const task = mockTask({ completed: true });

    it('should delete task and return it', async () => {
      service.deleteTask.mockResolvedValueOnce(task);

      const result = await controller.delete({ taskId: task.id }, socketId);

      expect(service.deleteTask).toHaveBeenCalledWith(task.id, socketId);
      expect(result).toEqual({ success: true, task });
    });
  });
});
