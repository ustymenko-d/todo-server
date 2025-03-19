export interface ICreateTaskPayload {
  title: string;
  description?: string | null;
  completed: boolean;
  parentTaskId?: string | null;
  expiresAt?: Date | null;
  folderId?: string | null;
  userId: string;
}

export interface ITask extends ICreateTaskPayload {
  id: string;
  createdAt?: Date;
  subtasks?: ITask[];
}

export interface ITaskResponse {
  success: boolean;
  task: ITask;
}

export interface ITasks {
  pages: number;
  total: number;
  tasks: ITask[];
}

export interface IGetTasksResponse {
  success: boolean;
  tasksData: ITasks;
}
