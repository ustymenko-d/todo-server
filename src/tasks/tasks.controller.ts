import {
  Body,
  Controller,
  Delete,
  Headers,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskOwner } from './tasks.guard';
import { TasksService } from './tasks.service';
import { GetTasksRequest, TaskBase, Task, TaskId } from './tasks.dto';
import { IJwtUser } from '@src/common/common.types';
import { ITaskResponse, IGetTasksResponse } from './tasks.types';
import { RecaptchaGuard } from '@src/common/recaptcha.guard';
import { StripRecaptchaInterceptor } from '@src/common/strip-recaptcha.interceptor';
import { handleRequest } from '@src/common/utils/requestHandler';

@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(private readonly tasksService: TasksService) {}

  @Post('create')
  @UseGuards(RecaptchaGuard, AuthGuard('jwt'))
  @UseInterceptors(StripRecaptchaInterceptor)
  async create(
    @Req() req: { user: IJwtUser },
    @Body() body: TaskBase,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<ITaskResponse> {
    return handleRequest(
      async () => ({
        success: true,
        message: 'Task created successfully.',
        task: await this.tasksService.createTask(
          {
            ...body,
            userId: req.user.userId,
          },
          socketId,
        ),
      }),
      'Error while creating a task.',
      this.logger,
    );
  }

  @Post('get')
  @UseGuards(AuthGuard('jwt'))
  async get(
    @Req() req: { user: IJwtUser },
    @Body() body: GetTasksRequest,
  ): Promise<IGetTasksResponse> {
    return handleRequest(
      async () =>
        await this.tasksService.getTasks({
          ...body,
          userId: req.user.userId,
        }),
      'Error while fetching tasks.',
      this.logger,
    );
  }

  @Put()
  @UseGuards(AuthGuard('jwt'), TaskOwner)
  async edit(
    @Body() body: Task,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<ITaskResponse> {
    return handleRequest(
      async () => ({
        success: true,
        message: 'Task edited successfully.',
        task: await this.tasksService.editTask(body, socketId),
      }),
      'Error while editing a task.',
      this.logger,
    );
  }

  @Patch(':taskId')
  @UseGuards(AuthGuard('jwt'), TaskOwner)
  async toggleStatus(
    @Param() { taskId }: TaskId,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<ITaskResponse> {
    return handleRequest(
      async () => ({
        success: true,
        message: 'Task status changed successfully.',
        task: await this.tasksService.toggleStatus(taskId, socketId),
      }),
      `Error while changing task status (ID: ${taskId}).`,
      this.logger,
    );
  }

  @Delete(':taskId')
  @UseGuards(AuthGuard('jwt'), TaskOwner)
  async delete(
    @Param() { taskId }: TaskId,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<ITaskResponse> {
    return handleRequest(
      async () => ({
        success: true,
        message: 'Task deleted successfully.',
        task: await this.tasksService.deleteTask(taskId, socketId),
      }),
      'Error while deleting a task.',
      this.logger,
    );
  }
}
