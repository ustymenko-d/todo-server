enum TaskStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
}

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
