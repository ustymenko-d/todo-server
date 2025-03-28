import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestHandlerService } from 'src/common/request-handler.service';
import { TaskOwnerGuard } from './task-owner.guard';
import { TasksService } from './tasks.service';
import {
  GetTasksRequestDto,
  TaskBaseDto,
  TaskDto,
  TaskIdDto,
} from './tasks.dto';
import { IJwtUser } from 'src/common/common.types';
import { IGetTasksResponse, ITaskResponse } from './task.types';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly requestHandlerService: RequestHandlerService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('get')
  async get(
    @Req() req: { user: IJwtUser },
    @Body() body: GetTasksRequestDto,
  ): Promise<IGetTasksResponse> {
    return this.requestHandlerService.handleRequest(async () => {
      const { userId } = req.user;
      return {
        success: true,
        data: await this.tasksService.getTasks({
          ...body,
          userId,
        }),
      };
    }, 'Error while fetching tasks');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('create')
  async create(
    @Req() req: { user: IJwtUser },
    @Body() body: TaskBaseDto,
  ): Promise<ITaskResponse> {
    return this.requestHandlerService.handleRequest(async () => {
      const { userId } = req.user;
      return {
        success: true,
        task: await this.tasksService.createTask({
          ...body,
          userId,
        }),
      };
    }, 'Error while creating a task');
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Put()
  async edit(@Body() body: TaskDto): Promise<ITaskResponse> {
    return this.requestHandlerService.handleRequest(async () => {
      return { success: true, task: await this.tasksService.editTask(body) };
    }, 'Error while editing a task');
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Patch(':taskId')
  async toggleStatus(@Param() { taskId }: TaskIdDto): Promise<ITaskResponse> {
    return this.requestHandlerService.handleRequest(async () => {
      return {
        success: true,
        task: await this.tasksService.toggleStatus(taskId),
      };
    }, `Error when change status of the task (${taskId})`);
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Delete(':taskId')
  async delete(@Param() { taskId }: TaskIdDto): Promise<ITaskResponse> {
    return this.requestHandlerService.handleRequest(async () => {
      return {
        success: true,
        task: await this.tasksService.deleteTask(taskId),
      };
    }, 'Error when deleting a task');
  }
}
