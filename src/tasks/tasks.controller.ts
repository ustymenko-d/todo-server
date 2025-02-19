import {
  Body,
  Controller,
  Delete,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import {
  GetTasksRequestDto,
  GetTasksResponseDto,
  TaskBaseDto,
  TaskDto,
  TaskResponseDto,
} from './tasks.dto';
import { AuthGuard } from '@nestjs/passport';
import { TaskOwnerGuard } from './task-owner.guard';
import { JwtUserDto } from 'src/auth/auth.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  private readonly logger = new Logger(TasksController.name);

  private handleError(message: string, error: Error): never {
    this.logger.error(message, error.stack);
    throw error;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('get')
  async get(@Body() body: GetTasksRequestDto): Promise<GetTasksResponseDto> {
    try {
      const tasksData = await this.tasksService.getTasks(body);
      return { success: true, tasksData };
    } catch (error) {
      this.handleError('Error while fetching tasks: ', error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('create')
  async create(
    @Req() req: { user: JwtUserDto },
    @Body() body: TaskBaseDto,
  ): Promise<TaskResponseDto> {
    try {
      const createdTask = await this.tasksService.createTask({
        ...body,
        userId: req.user.userId,
      });
      return { success: true, task: createdTask };
    } catch (error) {
      this.handleError('Error while creating a task: ', error);
    }
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Put()
  async edit(@Body() body: TaskDto): Promise<TaskResponseDto> {
    try {
      const updatedTask = await this.tasksService.editTask(body);
      return { success: true, task: updatedTask };
    } catch (error) {
      this.handleError('Error while editing a task: ', error);
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
      this.handleError(
        `Error when change status of the task (${taskId}): `,
        error,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Delete(':taskId')
  async delete(@Param('taskId') taskId: string): Promise<TaskResponseDto> {
    try {
      const deletedTask = await this.tasksService.deleteTask(taskId);
      return { success: true, task: deletedTask };
    } catch (error) {
      this.handleError('Error when deleting a task: ', error);
    }
  }
}
