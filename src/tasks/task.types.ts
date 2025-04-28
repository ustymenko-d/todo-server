import { Task } from './tasks.dto';

export interface ITask extends Task {
  subtasks?: ITask[];
}

export interface ITaskResponse {
  success: boolean;
  task: ITask;
}

export interface IGetTasksResponse {
  page: number;
  limit: number;
  pages: number;
  total: number;
  tasks: ITask[];
}
