import {
  Body,
  Controller,
  Delete,
  Logger,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { IGetTasksRequest, ITask, ITaskBase } from './tasks.interfaces';
import { TaskResponseDto } from './dto/task-response.dto';

@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly tasksService: TasksService) {}

  @Post('get')
  async get(@Body() body: IGetTasksRequest) {
    try {
      const tasksData = await this.tasksService.getTasks(body);
      return { success: true, tasksData };
    } catch (error) {
      this.logger.error('Error when fetching tasks: ', error);
      throw error;
    }
  }

  @Post()
  async create(@Body() body: ITaskBase): Promise<TaskResponseDto> {
    try {
      const createdTask = await this.tasksService.createTask(body);
      return { success: true, task: createdTask };
    } catch (error) {
      this.logger.error('Error when creating a task: ', error);
      throw error;
    }
  }

  @Put()
  async edit(@Body() body: ITask): Promise<TaskResponseDto> {
    try {
      const updatedTask = await this.tasksService.editeTask(body);
      return { success: true, task: updatedTask };
    } catch (error) {
      this.logger.error('Error when editing a task: ', error);
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
