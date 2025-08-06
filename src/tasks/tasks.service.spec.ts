import { ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { IGetTasksRequest } from './tasks.types';
import { mockPrisma } from 'test/mocks/prisma.mock';
import {
  mockTasksGateway,
  mockTask,
  TTasksGatewayMock,
} from 'test/mocks/tasks.mock';
import { buildPagination } from 'test/utils/buildPagination';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { TasksGateway } from 'src/sockets/tasks.gateway';

describe('TasksService', () => {
  let service: TasksService;
  let gatewayMock: TTasksGatewayMock;

  const task = mockTask();
  const socket = 'socket-id';

  beforeEach(async () => {
    jest.clearAllMocks();

    gatewayMock = mockTasksGateway();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TasksGateway, useValue: gatewayMock },
      ],
    }).compile();

    service = module.get(TasksService);
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

      await expect(() =>
        service.createTask({ title: '', userId: task.userId }, socket),
      ).rejects.toThrow(ForbiddenException);
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
        buildPagination('task', req, { userId: req.userId }),
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
});
