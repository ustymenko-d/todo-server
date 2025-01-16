import { Body, Controller, Delete, Logger, Param, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ITaskBase } from './tasks.interfaces';
import { CreateTaskResponseDto } from './dto/create-task-response.dto';

@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() body: ITaskBase): Promise<CreateTaskResponseDto> {
    try {
      const createdTask = await this.tasksService.createTask(body);
      return { success: true, task: createdTask };
    } catch (error) {
      this.logger.error('Error when creating a task: ', error);
      throw error;
    }
  }

  @Delete(':taskId')
  async delete(@Param('taskId') taskId: string) {
    try {
      const deletedTask = await this.tasksService.deleteTask(taskId);
      return { success: true, task: deletedTask };
    } catch (error) {
      this.logger.error('Error when deleting a task: ', error);
      throw error;
    }
  }
}
