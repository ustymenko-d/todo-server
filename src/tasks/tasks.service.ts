import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestHandlerService } from 'src/common/request-handler.service';
import {
  CreateTaskPayload,
  GetTasksPayloadDto,
  ManyTasksDto,
  TaskDto,
  TaskIdDto,
} from './tasks.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private readonly requestHandlerService: RequestHandlerService,
  ) {}

  private async isUserVerified(userId: string): Promise<boolean> {
    const { isVerified } = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true },
    });
    return isVerified;
  }

  private async getUserTaskCount(userId: string): Promise<number> {
    return await this.prisma.task.count({
      where: { userId },
    });
  }

  private async ensureTaskExists(id: string): Promise<void> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Task with id ${id} not found`);
  }

  private async validateTaskCreation(userId: string): Promise<void> {
    if (!(await this.isUserVerified(userId))) {
      const taskCount = await this.getUserTaskCount(userId);
      if (taskCount >= 10)
        throw new ForbiddenException(
          'Unverified users cannot create more than ten tasks',
        );
    }
  }

  async getTasks(payload: GetTasksPayloadDto): Promise<ManyTasksDto> {
    return await this.requestHandlerService.handleRequest(
      async () => {
        const {
          page,
          limit,
          completed,
          userId,
          topLayerTasks,
          taskId,
          title,
          folderId,
        } = payload;
        const skip = (page - 1) * limit;
        const where: Prisma.TaskWhereInput = Object.assign(
          {},
          taskId && { id: taskId },
          completed !== undefined && completed !== null && { completed },
          userId && { userId },
          topLayerTasks && { parentTaskId: null },
          folderId && { folderId },
          title && {
            title: {
              contains: title,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        );

        const [tasks, total] = await this.prisma.$transaction([
          this.prisma.task.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              subtasks: true,
            },
          }),
          this.prisma.task.count({ where }),
        ]);

        return {
          tasks,
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        };
      },
      'Error while fetching tasks',
      true,
    );
  }

  async createTask(payload: CreateTaskPayload): Promise<TaskDto> {
    return await this.requestHandlerService.handleRequest(
      async () => {
        const { userId, parentTaskId } = payload;
        await this.validateTaskCreation(userId);
        if (parentTaskId) await this.ensureTaskExists(parentTaskId);
        return await this.prisma.task.create({
          data: {
            ...payload,
            id: uuidv4(),
            createdAt: new Date(),
          },
        });
      },
      'Error while creating a task',
      true,
    );
  }

  async editTask(payload: TaskDto): Promise<TaskDto> {
    return await this.requestHandlerService.handleRequest(
      async () => {
        await this.ensureTaskExists(payload.id);
        return await this.prisma.task.update({
          where: { id: payload.id },
          data: { ...payload },
        });
      },
      'Error while editing a task',
      true,
    );
  }

  async toggleStatus({ taskId }: TaskIdDto): Promise<TaskDto> {
    return await this.requestHandlerService.handleRequest(
      async () => {
        const task = await this.prisma.task.findUniqueOrThrow({
          where: { id: taskId },
          select: { completed: true },
        });

        return await this.prisma.task.update({
          where: { id: taskId },
          data: { completed: !task.completed },
        });
      },
      'Error while changing task status',
      true,
    );
  }

  async deleteTask({ taskId }: TaskIdDto): Promise<TaskDto> {
    return await this.requestHandlerService.handleRequest(
      async () =>
        this.prisma.task.delete({
          where: { id: taskId },
        }),
      'Error while deleting a task',
      true,
    );
  }
}
