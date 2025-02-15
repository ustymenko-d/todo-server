import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { GetTasksRequestDto, TaskBaseDto, TaskDto } from './tasks.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private prisma: PrismaService) {}

  async getTasks(payload: GetTasksRequestDto) {
    try {
      const { page, limit, completed, userId, topLayerTasks, taskId } = payload;

      const skip = (page - 1) * limit;
      const where: Prisma.TaskWhereInput = {};

      if (taskId) {
        where.id = taskId;
      }

      if (completed) {
        where.completed = completed;
      }

      if (userId) {
        where.userId = userId;
      }

      if (topLayerTasks) {
        where.parentTaskId = null;
      }

      const [tasks, total] = await this.prisma.$transaction([
        this.prisma.task.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            // user: true,
            // parentTask: true,
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
      this.logger.error('Error while fetching tasks', error.stack);
      throw new Error('Fetching tasks failed');
    }
  }

  async createTask(taskBody: TaskBaseDto): Promise<TaskDto> {
    try {
      const { userId, parentTaskId } = taskBody;
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new Error(`User (${userId}) not found`);
      }

      if (parentTaskId) {
        const parentTask = await this.prisma.task.findUnique({
          where: { id: parentTaskId },
        });

        if (!parentTask) {
          throw new Error(`Parent task with id ${parentTaskId} not found`);
        }
      }

      const newTask: TaskDto = {
        ...taskBody,
        id: uuidv4(),
        createdAt: new Date(),
      };

      const createdTask = await this.prisma.task.create({
        data: {
          ...newTask,
        },
      });

      this.logger.log(`Task created successfully with ID: ${createdTask.id}`);

      return newTask;
    } catch (error) {
      this.logger.error('Error while creating task', error.stack);
      throw new Error('Task creation failed');
    }
  }

  async editeTask(payload: TaskDto): Promise<TaskDto> {
    try {
      const { id } = payload;

      const targetTask = await this.prisma.task.findUnique({
        where: { id },
      });

      if (!targetTask) {
        throw new Error(`Task with id ${id} not found`);
      }

      return await this.prisma.task.update({
        where: { id },
        data: { ...payload },
      });
    } catch (error) {
      this.logger.error('Error while editing task', error.stack);
      throw new Error('Task editing failed');
    }
  }

  async toggleStatus(taskId: string) {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: { completed: true },
      });

      if (!task) {
        throw new Error(`Task with id ${taskId} not found`);
      }

      const updatedTask = await this.prisma.task.update({
        where: { id: taskId },
        data: { completed: !task.completed },
      });

      return updatedTask;
    } catch (error) {
      this.logger.error(
        `Error while change status of the task (${taskId})`,
        error.stack,
      );
      throw new Error('Task editing failed');
    }
  }

  async deleteTask(taskId: string) {
    try {
      const deletedTask = await this.prisma.task.delete({
        where: { id: taskId },
      });

      this.logger.log(`Task with ID: ${taskId} deleted successfully.`);
      return deletedTask;
    } catch (error) {
      this.logger.error('Error while deleting task', error.stack);
      throw new Error('Task deleting failed');
    }
  }
}
