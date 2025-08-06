import { PrismaWhereInput } from 'src/common/common.types';
import { PrismaService } from 'src/prisma/prisma.service';

type CleanupTask<T extends keyof PrismaService> = {
  entity: T;
  conditionsProvider: () => PrismaWhereInput<T>;
};

export type AllCleanupTasks = CleanupTask<'user'> | CleanupTask<'refreshToken'>;
