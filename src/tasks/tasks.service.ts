import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { ITask, ITaskBase } from './tasks.interfaces';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private prisma: PrismaService) {}

  async createTask(taskBody: ITaskBase): Promise<ITask> {
    try {
      const { userId, parentTaskId } = taskBody;
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      if (parentTaskId) {
        const parentTask = await this.prisma.task.findUnique({
          where: { id: parentTaskId },
        });

        if (!parentTask) {
          throw new Error('Parent task not found');
        }
      }

      const newTask: ITask = {
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

  async deleteTask(taskId: string) {
    try {
      const deletedTask = await this.prisma.task.delete({
        where: { id: taskId },
      });

      this.logger.log(`Task with ID: ${taskId} deleted successfully.`);
      return deletedTask;
    } catch (error) {
      this.logger.error('Error while deleting task', error.stack);
      throw new Error('Task creation failed');
    }
  }
}
