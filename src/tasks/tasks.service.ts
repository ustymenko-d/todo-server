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
  TaskWithSubtasks,
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

  private async getTaskById(
    taskId: string,
    includeSubtasks: boolean = false,
  ): Promise<TaskDto | TaskWithSubtasks> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { subtasks: includeSubtasks },
    });

    if (!task)
      throw new NotFoundException(`Task with id: '${taskId}' not found`);

    return task;
  }

  private async validateTaskCreation(userId: string): Promise<void> {
    if (
      !(await this.isUserVerified(userId)) &&
      (await this.getUserTaskCount(userId)) >= 10
    ) {
      throw new ForbiddenException(
        'Unverified users cannot create more than ten tasks',
      );
    }
  }

  private async getAllSubtaskIds(taskId: string): Promise<string[]> {
    const subtasks = await this.prisma.task.findMany({
      where: { parentTaskId: taskId },
      select: { id: true },
    });

    let subtaskIds = subtasks.map((task) => task.id);

    for (const subtask of subtasks) {
      subtaskIds = subtaskIds.concat(await this.getAllSubtaskIds(subtask.id));
    }

    return subtaskIds;
  }

  private async handleSubtaskUpdates(
    task: TaskWithSubtasks,
    newParentId: string | null,
  ) {
    if (!newParentId) return;

    const { id, parentTaskId, subtasks } = task;

    if (subtasks.some((sub) => sub.id === newParentId)) {
      await this.prisma.task.updateMany({
        where: { parentTaskId: id },
        data: { parentTaskId: parentTaskId || null },
      });
    } else {
      const allSubtasks = await this.getAllSubtaskIds(id);
      if (allSubtasks.includes(newParentId)) {
        await this.prisma.task.update({
          where: { id: newParentId },
          data: { parentTaskId: parentTaskId || null },
        });
      }
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
        if (parentTaskId) await this.getTaskById(parentTaskId);
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
        const { id, parentTaskId } = payload;
        const task = await this.getTaskById(id, true);

        if ('subtasks' in task && task.subtasks.length > 0)
          await this.handleSubtaskUpdates(task, parentTaskId);

        return await this.prisma.task.update({
          where: { id },
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
