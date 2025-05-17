import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TasksGateway } from 'src/sockets/tasks.gateway';
import { GetTasksRequest, Task, TaskBase } from './tasks.dto';
import { ITask, IGetTasksResponse } from './tasks.types';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private tasksGateway: TasksGateway,
  ) {}

  async createTask(
    payload: TaskBase & { userId: string },
    socketId: string,
  ): Promise<ITask> {
    const { userId, parentTaskId, folderId } = payload;
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

    if (folderId) await this.folderIdValidation(folderId, userId);

    const task = await this.prisma.task.create({ data: payload });
    this.tasksGateway.emitTaskCreated(task, socketId);
    return task;
  }

  async getTasks(
    payload: GetTasksRequest & { userId: string },
  ): Promise<IGetTasksResponse> {
    const { page, limit } = payload;
    const skip = (page - 1) * limit;
    const where = this.buildTaskWhereInput(payload);

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastEdited: 'desc' },
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
  }

  async editTask(payload: Task, socketId: string): Promise<ITask> {
    const { id, parentTaskId, folderId, userId } = payload;

    if (parentTaskId) {
      const allSubtaskIds = await this.getAllSubtaskIds(id);

      if (allSubtaskIds.includes(parentTaskId))
        throw new UnprocessableEntityException(
          'A parent task cannot be moved down the hierarchy',
        );

      await this.subtaskCountValidation(parentTaskId);

      const targetDepth = await this.getTaskDepth(parentTaskId);
      const currentMaxDepth = await this.getMaxSubtaskDepth(id, 1);
      if (targetDepth + currentMaxDepth > 5)
        throw new UnprocessableEntityException(
          'Moving this task would exceed the maximum depth of 5',
        );
    }

    if (folderId) await this.folderIdValidation(folderId, userId);

    const updated = await this.prisma.task.update({
      where: { id },
      data: { ...payload },
    });
    this.tasksGateway.emitTaskUpdated(updated, socketId);
    return updated;
  }

  async toggleStatus(id: string, socketId: string): Promise<ITask> {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id },
      select: { completed: true },
    });

    const updated = await this.prisma.task.update({
      where: { id },
      data: { completed: !task.completed },
    });
    this.tasksGateway.emitTaskToggleStatus(updated, socketId);
    return updated;
  }

  async deleteTask(id: string, socketId: string): Promise<ITask> {
    const deleted = await this.prisma.task.delete({ where: { id } });
    this.tasksGateway.emitTaskDeleted(deleted, socketId);
    return deleted;
  }

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
    id: string,
    includeSubtasks: boolean = false,
  ): Promise<ITask> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { subtasks: includeSubtasks },
    });

    if (!task) throw new NotFoundException(`Task with id: '${id}' not found`);

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
      task.subtasks.map(
        async (subtask: ITask) => await this.getTaskWithSubtasks(subtask.id),
      ),
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
    const subtasksCount = await this.prisma.task.count({
      where: {
        parentTaskId,
      },
    });

    if (subtasksCount >= 25)
      throw new UnprocessableEntityException(
        'Maximum number of subtasks (25) reached',
      );
  }

  private async getMaxSubtaskDepth(
    parentTaskId: string,
    depth: number,
  ): Promise<number> {
    const subtasks = await this.prisma.task.findMany({
      where: { parentTaskId },
      select: { id: true },
    });

    if (subtasks.length === 0) return depth;

    const subtaskDepths = await Promise.all(
      subtasks.map((subtask) => this.getMaxSubtaskDepth(subtask.id, depth + 1)),
    );

    return Math.max(...subtaskDepths);
  }

  private buildTaskWhereInput(
    payload: GetTasksRequest & { userId: string },
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

  private async folderIdValidation(id: string, userId: string): Promise<void> {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!folder)
      throw new NotFoundException(`Folder with id (${id}) not found`);

    if (folder.userId !== userId)
      throw new ForbiddenException(
        `User with ID (${userId}) doesn't own this folder`,
      );
  }
}
