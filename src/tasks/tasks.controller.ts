import {
  Body,
  Controller,
  Delete,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import {
  GetTasksRequestDto,
  TaskBaseDto,
  TaskDto,
  TaskResponseDto,
} from './tasks.dto';
import { AuthGuard } from '@nestjs/passport';
import { TaskOwnerGuard } from './task-owner.guard';

@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly tasksService: TasksService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('get')
  async get(@Body() body: GetTasksRequestDto) {
    try {
      const tasksData = await this.tasksService.getTasks(body);
      return { success: true, tasksData };
    } catch (error) {
      this.logger.error('Error when fetching tasks: ', error);
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() body: TaskBaseDto): Promise<TaskResponseDto> {
    try {
      const createdTask = await this.tasksService.createTask(body);
      return { success: true, task: createdTask };
    } catch (error) {
      this.logger.error('Error when creating a task: ', error);
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Put()
  async edit(@Body() body: TaskDto): Promise<TaskResponseDto> {
    try {
      const updatedTask = await this.tasksService.editeTask(body);
      return { success: true, task: updatedTask };
    } catch (error) {
      this.logger.error('Error when editing a task: ', error);
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Patch(':taskId')
  async toggleStatus(
    @Param('taskId') taskId: string,
  ): Promise<TaskResponseDto> {
    try {
      const updatedTask = await this.tasksService.toggleStatus(taskId);
      return { success: true, task: updatedTask };
    } catch (error) {
      this.logger.error(
        `Error when change status of the task (${taskId}): `,
        error,
      );
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
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
