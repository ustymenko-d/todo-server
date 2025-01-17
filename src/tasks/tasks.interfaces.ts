export type TaskStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface ITaskBase {
  title: string;
  description?: string | null;
  status: TaskStatus;
  userId: string;
  parentTaskId?: string | null;
  expiresAt?: Date | null;
}

export interface ITask extends ITaskBase {
  id: string;
  createdAt: Date;
}

export interface IGetTasksRequest {
  page: number;
  limit: number;
  status?: TaskStatus;
  userId?: string;
  topLayerTasks?: boolean;
  taskId: string;
}
