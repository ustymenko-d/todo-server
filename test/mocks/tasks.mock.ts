import { ITask } from 'src/tasks/tasks.types';
import { createMockMethods } from 'test/utils/createMockMethods';

export const mockTasksService = () =>
  createMockMethods([
    'createTask',
    'getTasks',
    'editTask',
    'toggleStatus',
    'deleteTask',
  ] as const);

export type TTasksServiceMock = ReturnType<typeof mockTasksService>;

export const mockTasksGateway = () =>
  createMockMethods([
    'emitTaskCreated',
    'emitTaskUpdated',
    'emitTaskDeleted',
    'emitTaskToggleStatus',
  ] as const);

export type TTasksGatewayMock = ReturnType<typeof mockTasksGateway>;

export const mockTask = (overrides: Partial<ITask> = {}): ITask => ({
  ...defaultTask(),
  subtasks: overrides.subtasks ?? [],
  ...overrides,
});

export const mockSubtask = (overrides: Partial<ITask> = {}): ITask => ({
  ...defaultTask(),
  id: 'task-id-2',
  title: 'Subtask title',
  completed: true,
  parentTaskId: 'task-id-1',
  subtasks: [],
  ...overrides,
});

const defaultTask = (): ITask => ({
  id: 'task-id-1',
  title: 'Task title',
  completed: false,
  userId: 'user-id',
  description: 'Task description',
  folderId: 'folder-id',
  startDate: new Date(),
  expiresDate: null,
  parentTaskId: null,
  subtasks: [],
});
