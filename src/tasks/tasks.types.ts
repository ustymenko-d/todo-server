import { IPagination } from 'src/common/common.types';
import { GetTasksRequest, Task } from './tasks.dto';

export interface ITask extends Task {
  subtasks?: ITask[];
}

export interface ITaskResponse {
  success: boolean;
  task: ITask;
}

export interface IGetTasksRequest extends GetTasksRequest {
  userId: string;
}

export interface IGetTasksResponse extends IPagination {
  tasks: ITask[];
}
