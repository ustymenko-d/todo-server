import { Prisma } from '@prisma/client';
import { IGetTasksRequest } from 'src/tasks/tasks.types';
import { mockPrisma } from 'test/mocks/prisma.mock';

type TTables = 'task' | 'folder';

interface IWhereInputMap {
  task: Prisma.TaskWhereInput;
  folder: Prisma.FolderWhereInput;
}

export const buildPagination = <T extends TTables>(
  table: T,
  req: IGetTasksRequest,
  where: IWhereInputMap[T],
) => [
  mockPrisma[table].findMany({
    where,
    skip: (req.page - 1) * req.limit,
    take: req.limit,
  }),
  mockPrisma[table].count({ where }),
];
