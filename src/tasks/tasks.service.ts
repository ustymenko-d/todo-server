import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import {
  GetTasksRequestDto,
  ManyTasksDto,
  TaskBaseAndOwnerDto,
  TaskDto,
} from './tasks.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(TasksService.name);

  async getTasks(payload: GetTasksRequestDto): Promise<ManyTasksDto> {
    try {
      const { page, limit, completed, userId, topLayerTasks, taskId } = payload;
      const skip = (page - 1) * limit;
      const where: Prisma.TaskWhereInput = Object.assign(
        {},
        taskId && { id: taskId },
        completed !== undefined && completed !== null && { completed },
        userId && { userId },
        topLayerTasks && { parentTaskId: null },
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
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createTask(taskBody: TaskBaseAndOwnerDto): Promise<TaskDto> {
    try {
      const { userId, parentTaskId } = taskBody;
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) throw new NotFoundException(`User (${userId}) not found`);

      if (parentTaskId) {
        const parentTask = await this.prisma.task.findUnique({
          where: { id: parentTaskId },
        });

        if (!parentTask) {
          throw new NotFoundException(
            `Parent task (${parentTaskId}) not found`,
          );
        }
      }

      const newTaskPayload: TaskDto = {
        ...taskBody,
        id: uuidv4(),
        createdAt: new Date(),
      };

      return await this.prisma.task.create({
        data: {
          ...newTaskPayload,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async editTask(payload: TaskDto): Promise<TaskDto> {
    try {
      const { id } = payload;

      const targetTask = await this.prisma.task.findUnique({
        where: { id },
      });

      if (!targetTask)
        throw new NotFoundException(`Task with id ${id} not found`);

      return await this.prisma.task.update({
        where: { id },
        data: { ...payload },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async toggleStatus(taskId: string): Promise<TaskDto> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: { completed: true },
      });

      if (!task)
        throw new NotFoundException(`Task with id ${taskId} not found`);

      return await this.prisma.task.update({
        where: { id: taskId },
        data: { completed: !task.completed },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<TaskDto> {
    try {
      return await this.prisma.task.delete({
        where: { id: taskId },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
