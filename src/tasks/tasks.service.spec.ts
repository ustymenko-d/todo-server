import { TasksService } from './tasks.service';
import { ForbiddenException } from '@nestjs/common';
import { Task } from './tasks.dto';
import { IGetTasksRequest } from './tasks.types';
import { mockDatabase } from 'test/mocks/database.mock';
import { mockTasksGateway, mockTask } from 'test/mocks/tasks.mock';

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(() => {
    service = new TasksService(mockDatabase as any, mockTasksGateway as any);
    jest.clearAllMocks();
  });

  describe('createTask()', () => {
    it('should create and emit task', async () => {
      const task = mockTask();
      mockDatabase.user.findUnique.mockResolvedValueOnce({ isVerified: true });
      mockDatabase.task.create.mockResolvedValueOnce(task);

      const payload = { title: 'Test', userId: 'user-id' };
      const result = await service.createTask(payload, 'socket');

      expect(mockDatabase.task.create).toHaveBeenCalledWith({ data: payload });
      expect(mockTasksGateway.emitTaskCreated).toHaveBeenCalledWith(
        task,
        'socket',
      );
      expect(result).toEqual(task);
    });

    it('should throw if unverified and too many tasks', async () => {
      mockDatabase.user.findUnique.mockResolvedValueOnce({ isVerified: false });
      mockDatabase.task.count.mockResolvedValueOnce(15);

      await expect(
        service.createTask({ userId: 'u', title: '' }, 's'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('toggleStatus()', () => {
    it('should toggle completion and emit', async () => {
      const task = mockTask();
      mockDatabase.task.findUniqueOrThrow.mockResolvedValueOnce({
        completed: false,
      });
      mockDatabase.task.update.mockResolvedValueOnce(task);

      const result = await service.toggleStatus('1', 'socket');

      expect(mockDatabase.task.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { completed: true },
      });
      expect(mockTasksGateway.emitTaskToggleStatus).toHaveBeenCalled();
      expect(result).toEqual(task);
    });
  });

  describe('deleteTask()', () => {
    it('should delete and emit', async () => {
      const task = mockTask();
      mockDatabase.task.delete.mockResolvedValueOnce(task);

      const result = await service.deleteTask('1', 'socket');

      expect(mockDatabase.task.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockTasksGateway.emitTaskDeleted).toHaveBeenCalledWith(
        task,
        'socket',
      );
      expect(result).toEqual(task);
    });
  });

  describe('editTask()', () => {
    it('should update and emit', async () => {
      const task = mockTask();
      const input: Task = { ...task, title: 'Updated title' };
      mockDatabase.task.update.mockResolvedValueOnce(input);

      mockDatabase.folder.findUnique.mockResolvedValueOnce({
        id: 'folder-id',
        userId: 'user-id',
        title: 'Folder title',
      });

      const result = await service.editTask(input, 'socket');

      expect(mockDatabase.task.update).toHaveBeenCalledWith({
        where: { id: input.id },
        data: input,
      });
      expect(mockTasksGateway.emitTaskUpdated).toHaveBeenCalledWith(
        input,
        'socket',
      );
      expect(result).toEqual(input);
    });
  });

  describe('getTasks()', () => {
    it('should return paginated tasks', async () => {
      const task = mockTask();
      const req: IGetTasksRequest = {
        page: 1,
        limit: 10,
        userId: 'user-id',
      };

      mockDatabase.$transaction.mockResolvedValueOnce([[{ id: task.id }], 1]);

      mockDatabase.task.findUnique.mockImplementation(({ where }) => {
        if (where.id === task.id) {
          return Promise.resolve({ ...task, subtasks: [] });
        }
        return Promise.resolve(null);
      });

      const result = await service.getTasks(req);

      expect(result).toEqual({
        tasks: [{ ...task, subtasks: [] }],
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
      });

      expect(mockDatabase.$transaction).toHaveBeenCalledTimes(1);
      expect(mockDatabase.task.findUnique).toHaveBeenCalledWith({
        where: { id: task.id },
        include: { subtasks: true },
      });
    });
  });
});
