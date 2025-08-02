import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

export interface IJwtUser {
  userId: string;
  email: string;
  tokenVersion: number;
  sessionId: string;
}

export interface IResponseStatus {
  success: boolean;
  message: string;
}

export type WhereUniqueInput<T extends keyof DatabaseService> =
  T extends 'folder'
    ? Prisma.FolderWhereUniqueInput
    : T extends 'task'
      ? Prisma.TaskWhereUniqueInput
      : never;

export type PrismaWhereInput<T extends keyof DatabaseService> =
  T extends 'refreshToken'
    ? Prisma.RefreshTokenWhereInput
    : T extends 'user'
      ? Prisma.UserWhereInput
      : never;
