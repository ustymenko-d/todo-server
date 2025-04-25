import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ICreateFolderPayload,
  IFolder,
  IGetFolderPayload,
  IGetFolderResponse,
} from './folders.types';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async createFolder(payload: ICreateFolderPayload): Promise<IFolder> {
    const { userId } = payload;

    const { isVerified } = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true },
    });

    const userFoldersCount = await this.prisma.folder.count({
      where: { userId },
    });

    if (!isVerified && userFoldersCount >= 3)
      throw new ForbiddenException(
        'Unverified users cannot create more than three folders',
      );

    if (isVerified && userFoldersCount >= 25)
      throw new ForbiddenException('You cannot create more than 25 folders');

    return await this.prisma.folder.create({ data: payload });
  }

  async getFolders(payload: IGetFolderPayload): Promise<IGetFolderResponse> {
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

  async renameFolder(id: string, name: string): Promise<IFolder> {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!folder) throw new NotFoundException(`Folder with id ${id} not found`);

    return await this.prisma.folder.update({
      where: { id },
      data: { name },
    });
  }

  async deleteFolder(id: string): Promise<IFolder> {
    return await this.prisma.folder.delete({ where: { id } });
  }

  private buildFolderWhereInput(
    payload: IGetFolderPayload,
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
