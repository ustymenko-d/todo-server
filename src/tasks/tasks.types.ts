import { IPagination, IResponseStatus } from 'src/common/common.types';
import { GetTasksRequest, Task } from './tasks.dto';

export interface ITask extends Task {
  subtasks?: ITask[];
}

export interface ITaskResponse extends IResponseStatus {
  task: ITask;
}

export interface IGetTasksRequest extends GetTasksRequest {
  userId: string;
}

export interface IGetTasksResponse extends IPagination {
  tasks: ITask[];
}
