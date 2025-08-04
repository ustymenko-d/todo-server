import { createMockMethods } from 'test/utils/createMockMethods';

export const mockPrisma = {
  task: createMockMethods([
    'create',
    'count',
    'findUnique',
    'findUniqueOrThrow',
    'update',
    'delete',
    'findMany',
    'deleteMany',
  ] as const),
  user: createMockMethods([
    'create',
    'update',
    'delete',
    'findUnique',
    'deleteMany',
  ] as const),
  folder: createMockMethods([
    'create',
    'update',
    'delete',
    'count',
    'findMany',
    'findUnique',
  ] as const),
  refreshToken: createMockMethods([
    'create',
    'findFirst',
    'updateMany',
    'deleteMany',
  ] as const),
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};
