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
  GetTasksResponseDto,
  TaskBaseDto,
  TaskDto,
  TaskIdDto,
  TaskResponseDto,
} from './tasks.dto';
import { JwtUser } from 'src/common/common.dto';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly requestHandlerService: RequestHandlerService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('get')
  async get(
    @Req() req: { user: JwtUser },
    @Body() body: GetTasksRequestDto,
  ): Promise<GetTasksResponseDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const tasksData = await this.tasksService.getTasks({
        ...body,
        userId: req.user.userId,
      });
      return { success: true, tasksData };
    }, 'Error while fetching tasks');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('create')
  async create(
    @Req() req: { user: JwtUser },
    @Body() body: TaskBaseDto,
  ): Promise<TaskResponseDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const createdTask = await this.tasksService.createTask({
        ...body,
        userId: req.user.userId,
      });
      return { success: true, task: createdTask };
    }, 'Error while creating a task');
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Put()
  async edit(@Body() body: TaskDto): Promise<TaskResponseDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const updatedTask = await this.tasksService.editTask(body);
      return { success: true, task: updatedTask };
    }, 'Error while editing a task');
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Patch(':taskId')
  async toggleStatus(@Param() { taskId }: TaskIdDto): Promise<TaskResponseDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const updatedTask = await this.tasksService.toggleStatus({ taskId });
      return { success: true, task: updatedTask };
    }, `Error when change status of the task (${taskId})`);
  }

  @UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
  @Delete(':taskId')
  async delete(@Param() { taskId }: TaskIdDto): Promise<TaskResponseDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const deletedTask = await this.tasksService.deleteTask({ taskId });
      return { success: true, task: deletedTask };
    }, 'Error when deleting a task');
  }
}
