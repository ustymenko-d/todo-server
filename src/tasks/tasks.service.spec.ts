import { ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { IGetTasksRequest } from './tasks.types';
import { mockPrisma } from 'test/mocks/prisma.mock';
import {
  mockTasksGateway,
  mockTask,
  TTasksGatewayMock,
} from 'test/mocks/tasks.mock';

describe('TasksService', () => {
  let service: TasksService;
  let gatewayMock: TTasksGatewayMock;
  let task: ReturnType<typeof mockTask>;
  const socket = 'socket-id';

  const expectForbidden = async (fn: () => Promise<any>) =>
    await expect(fn()).rejects.toThrow(ForbiddenException);

  const buildPagination = (req: IGetTasksRequest) => [
    mockPrisma.task.findMany({
      where: { userId: req.userId },
      skip: (req.page - 1) * req.limit,
      take: req.limit,
    }),
    mockPrisma.task.count({ where: { userId: req.userId } }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    task = mockTask();
    gatewayMock = mockTasksGateway();
    service = new TasksService(mockPrisma as any, gatewayMock as any);
  });

  describe('createTask()', () => {
    it('creates and emits', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ isVerified: true });
      mockPrisma.task.create.mockResolvedValueOnce(task);

      const payload = { title: 'T', userId: task.userId };
      const result = await service.createTask(payload, socket);

      expect(mockPrisma.task.create).toHaveBeenCalledWith({ data: payload });
      expect(gatewayMock.emitTaskCreated).toHaveBeenCalledWith(result, socket);
      expect(result).toEqual(task);
    });

    it('forbids if unverified with many tasks', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ isVerified: false });
      mockPrisma.task.count.mockResolvedValueOnce(15);

      await expectForbidden(() =>
        service.createTask({ title: '', userId: task.userId }, socket),
      );
    });
  });

  describe('toggleStatus()', () => {
    it('toggles and emits', async () => {
      mockPrisma.task.findUniqueOrThrow.mockResolvedValueOnce({
        completed: false,
      });
      mockPrisma.task.update.mockResolvedValueOnce(task);

      const result = await service.toggleStatus(task.id, socket);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: task.id },
        data: { completed: true },
      });
      expect(gatewayMock.emitTaskToggleStatus).toHaveBeenCalledWith(
        result,
        socket,
      );
      expect(result).toEqual(task);
    });
  });

  describe('editTask()', () => {
    it('updates and emits', async () => {
      const updated = { ...task, title: 'New' };
      mockPrisma.folder.findUnique.mockResolvedValueOnce({
        id: updated.folderId,
        userId: updated.userId,
      });
      mockPrisma.task.update.mockResolvedValueOnce(updated);

      const result = await service.editTask(updated, socket);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: updated.id },
        data: updated,
      });
      expect(gatewayMock.emitTaskUpdated).toHaveBeenCalledWith(result, socket);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteTask()', () => {
    it('deletes and emits', async () => {
      mockPrisma.task.delete.mockResolvedValueOnce(task);

      const result = await service.deleteTask(task.id, socket);

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: task.id },
      });
      expect(gatewayMock.emitTaskDeleted).toHaveBeenCalledWith(result, socket);
      expect(result).toEqual(task);
    });
  });

  describe('getTasks()', () => {
    it('returns paginated and includes subtasks', async () => {
      const req: IGetTasksRequest = { page: 1, limit: 10, userId: task.userId };
      const partials = [{ id: task.id }];
      mockPrisma.$transaction.mockResolvedValueOnce([partials, 1]);

      mockPrisma.task.findUnique.mockImplementation(({ where }) =>
        where.id === task.id
          ? Promise.resolve({ ...task, subtasks: [] })
          : Promise.resolve(null),
      );

      const result = await service.getTasks(req);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        buildPagination(req),
      );
      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: task.id },
        include: { subtasks: true },
      });
      expect(result).toEqual({
        tasks: [{ ...task, subtasks: [] }],
        page: req.page,
        limit: req.limit,
        total: 1,
        pages: 1,
      });
    });
  });
});
