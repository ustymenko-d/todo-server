import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { FoldersGateway } from 'src/sockets/folders.gateway';
import {
  ICreateFolderPayload,
  IFolder,
  TGetFoldersPayload,
  IGetFoldersResponse,
} from './folders.types';

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private foldersGateway: FoldersGateway,
  ) {}

  async createFolder(
    payload: ICreateFolderPayload,
    socketId?: string,
  ): Promise<IFolder> {
    await this.checkFolderCreationLimit(payload.userId);
    const folder = await this.prisma.folder.create({ data: payload });
    this.foldersGateway.emitFolderCreated(folder, socketId);
    return folder;
  }

  async getFolders(payload: TGetFoldersPayload): Promise<IGetFoldersResponse> {
    const { page, limit } = payload;
    const skip = (page - 1) * limit;
    const where = this.buildFolderWhereInput(payload);

    const [folders, total] = await this.prisma.$transaction([
      this.prisma.folder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.folder.count({ where }),
    ]);

    return {
      folders,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async renameFolder(
    id: string,
    name: string,
    socketId?: string,
  ): Promise<IFolder> {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!folder) throw new NotFoundException(`Folder (ID: ${id}) not found.`);

    const updated = await this.prisma.folder.update({
      where: { id },
      data: { name },
    });

    this.foldersGateway.emitFolderRenamed(updated, socketId);
    return updated;
  }

  async deleteFolder(id: string, socketId?: string): Promise<IFolder> {
    const deleted = await this.prisma.folder.delete({ where: { id } });
    this.foldersGateway.emitFolderDeleted(deleted, socketId);
    return deleted;
  }

  // --- Helper methods ---

  private async checkFolderCreationLimit(userId: string): Promise<void> {
    const { isVerified } = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true },
    });

    const userFoldersCount = await this.prisma.folder.count({
      where: { userId },
    });

    if (!isVerified && userFoldersCount >= 3)
      throw new ForbiddenException(
        'Unverified users cannot create more than three folders.',
      );

    if (isVerified && userFoldersCount >= 25)
      throw new ForbiddenException('You cannot create more than 25 folders.');
  }

  private buildFolderWhereInput(
    payload: TGetFoldersPayload,
  ): Prisma.FolderWhereInput {
    const { userId, name } = payload;
    return Object.assign(
      { userId },
      name && {
        name: {
          contains: name,
          mode: Prisma.QueryMode.insensitive,
        },
      },
    );
  }
}
