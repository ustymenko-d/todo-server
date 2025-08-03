import { ITask } from 'src/tasks/tasks.types';

export const mockTasksService = () => ({
  createTask: jest.fn(),
  getTasks: jest.fn(),
  editTask: jest.fn(),
  toggleStatus: jest.fn(),
  deleteTask: jest.fn(),
});

export const mockTask = (overrides: Partial<ITask> = {}): ITask => ({
  id: 'task-id-1',
  title: 'Task title',
  completed: false,
  userId: 'user-id',
  description: 'Task description',
  folderId: 'folder-id',
  startDate: new Date(),
  expiresDate: null,
  parentTaskId: null,
  subtasks: [mockSubtask()],
  ...overrides,
});

export const mockSubtask = (overrides: Partial<ITask> = {}): ITask => ({
  id: 'task-id-2',
  title: 'Subtask title',
  completed: true,
  userId: 'user-id',
  description: 'Subtask description',
  folderId: 'folder-id',
  startDate: null,
  expiresDate: null,
  parentTaskId: 'task-id-1',
  subtasks: [],
  ...overrides,
});

export const mockTasksGateway = {
  emitTaskCreated: jest.fn(),
  emitTaskUpdated: jest.fn(),
  emitTaskDeleted: jest.fn(),
  emitTaskToggleStatus: jest.fn(),
};
