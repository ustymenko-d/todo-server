import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Pagination } from './common.dto';

export interface IPagination extends Pagination {
  pages: number;
  total: number;
}

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

export type WhereUniqueInput<T extends keyof PrismaService> = T extends 'folder'
  ? Prisma.FolderWhereUniqueInput
  : T extends 'task'
    ? Prisma.TaskWhereUniqueInput
    : never;

export type PrismaWhereInput<T extends keyof PrismaService> =
  T extends 'refreshToken'
    ? Prisma.RefreshTokenWhereInput
    : T extends 'user'
      ? Prisma.UserWhereInput
      : never;
