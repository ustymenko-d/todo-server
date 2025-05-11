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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskOwnerGuard } from './task-owner.guard';
import { TasksService } from './tasks.service';
import { GetTasksRequest, TaskBase, Task, TaskId } from './tasks.dto';
import { IJwtUser } from 'src/common/common.types';
import { ITaskResponse, IGetTasksResponse } from './task.types';
import { handleRequest } from 'src/common/utils/requestHandler';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('create')
  async create(
    @Req() req: { user: IJwtUser },
    @Body() body: TaskBase,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<ITaskResponse> {
    return handleRequest(
      async () => ({
        success: true,
        task: await this.tasksService.createTask(
          {
            ...body,
            userId: req.user.userId,
          },
          socketId,
        ),
      }),
      'Error while creating a task',
      this.logger,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('get')
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
      'Error while fetching tasks',
      this.logger,
    );
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Put()
  async edit(
    @Body() body: Task,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<ITaskResponse> {
    return handleRequest(
      async () => ({
        success: true,
        task: await this.tasksService.editTask(body, socketId),
      }),
      'Error while editing a task',
      this.logger,
    );
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Patch(':taskId')
  async toggleStatus(
    @Param() { taskId }: TaskId,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<ITaskResponse> {
    return handleRequest(
      async () => ({
        success: true,
        task: await this.tasksService.toggleStatus(taskId, socketId),
      }),
      `Error when change status of the task (${taskId})`,
      this.logger,
    );
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Delete(':taskId')
  async delete(
    @Param() { taskId }: TaskId,
    @Headers('x-socket-id') socketId?: string,
  ): Promise<ITaskResponse> {
    return handleRequest(
      async () => ({
        success: true,
        task: await this.tasksService.deleteTask(taskId, socketId),
      }),
      'Error when deleting a task',
      this.logger,
    );
  }

  private readonly logger = new Logger(TasksController.name);
}
