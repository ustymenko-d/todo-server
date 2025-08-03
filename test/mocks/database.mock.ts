export const mockDatabase = {
  task: {
    create: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
  folder: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};
