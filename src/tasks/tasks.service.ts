import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestHandlerService } from 'src/common/request-handler.service';
import { GetTasksPayloadDto, TaskDto } from './tasks.dto';
import { ICreateTaskPayload, ITask, ITasks } from './task.types';

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
  ): Promise<ITask> {
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

  private async getTaskWithSubtasks(taskId: string): Promise<ITask> {
    const task = await this.getTaskById(taskId, true);
    const subtasksWithChildren = await Promise.all(
      task.subtasks.map(async (subtask: ITask) => {
        return await this.getTaskWithSubtasks(subtask.id);
      }),
    );
    return { ...task, subtasks: subtasksWithChildren };
  }

  private async getTaskDepth(taskId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<{ depth: number }[]>`
      WITH RECURSIVE task_hierarchy AS (
        SELECT id, "parentTaskId", 1 AS depth
        FROM "Task"
        WHERE id = ${taskId}
        
        UNION ALL
        
        SELECT t.id, t."parentTaskId", h.depth + 1
        FROM "Task" t
        JOIN task_hierarchy h ON t.id = h."parentTaskId"
      )
      SELECT MAX(depth) as depth FROM task_hierarchy;
    `;

    return result[0]?.depth || 1;
  }

  private async subtaskCountValidation(parentTaskId: string): Promise<void> {
    const subtaskCount = await this.prisma.task.count({
      where: {
        parentTaskId,
      },
    });

    if (subtaskCount >= 25)
      throw new UnprocessableEntityException(
        'Maximum number of subtasks (25) reached',
      );
  }

  private async getMaxSubtaskDepth(
    taskId: string,
    depth: number,
  ): Promise<number> {
    const subtasks = await this.prisma.task.findMany({
      where: { parentTaskId: taskId },
      select: { id: true },
    });

    if (subtasks.length === 0) {
      return depth;
    }

    const subtaskDepths = await Promise.all(
      subtasks.map((subtask) => this.getMaxSubtaskDepth(subtask.id, depth + 1)),
    );

    return Math.max(...subtaskDepths);
  }

  private buildTaskWhereInput(
    payload: GetTasksPayloadDto,
  ): Prisma.TaskWhereInput {
    const { taskId, completed, userId, topLayerTasks, folderId, title } =
      payload;
    return Object.assign(
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
  }

  async getTasks(payload: GetTasksPayloadDto): Promise<ITasks> {
    return await this.requestHandlerService.handleRequest(
      async () => {
        const { page, limit } = payload;
        const skip = (page - 1) * limit;
        const where = this.buildTaskWhereInput(payload);

        const [tasks, total] = await this.prisma.$transaction([
          this.prisma.task.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          }),
          this.prisma.task.count({ where }),
        ]);

        const tasksWithSubtasks = await Promise.all(
          tasks.map((task) => this.getTaskWithSubtasks(task.id)),
        );

        return {
          tasks: tasksWithSubtasks,
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

  async createTask(payload: ICreateTaskPayload): Promise<ITask> {
    return await this.requestHandlerService.handleRequest(
      async () => {
        const { userId, parentTaskId } = payload;
        await this.validateTaskCreation(userId);

        if (parentTaskId) {
          await this.getTaskById(parentTaskId);
          const depth = await this.getTaskDepth(parentTaskId);
          if (depth >= 5)
            throw new UnprocessableEntityException(
              'Maximum task depth of 5 reached',
            );
          await this.subtaskCountValidation(parentTaskId);
        }

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

  async editTask(payload: TaskDto): Promise<ITask> {
    return await this.requestHandlerService.handleRequest(
      async () => {
        const { id, parentTaskId } = payload;

        if (parentTaskId) {
          const allSubtaskIds = await this.getAllSubtaskIds(id);

          if (allSubtaskIds.includes(parentTaskId)) {
            throw new UnprocessableEntityException(
              'A parent task cannot be moved down the hierarchy',
            );
          }

          await this.subtaskCountValidation(parentTaskId);

          const targetDepth = await this.getTaskDepth(parentTaskId);
          const currentMaxDepth = await this.getMaxSubtaskDepth(id, 1);
          if (targetDepth + currentMaxDepth > 5) {
            throw new UnprocessableEntityException(
              'Moving this task would exceed the maximum depth of 5',
            );
          }
        }

        return await this.prisma.task.update({
          where: { id },
          data: { ...payload },
        });
      },
      'Error while editing a task',
      true,
    );
  }

  async toggleStatus(taskId: string): Promise<ITask> {
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

  async deleteTask(taskId: string): Promise<ITask> {
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
