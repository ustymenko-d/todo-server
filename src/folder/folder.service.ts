import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  FolderDto,
  FolderPayloadDto,
  GetFolderPayloadDto,
  GetFolderResponseDto,
} from './folder.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FolderService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(FolderService.name);

  async createFolder(payload: FolderPayloadDto): Promise<FolderDto> {
    try {
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

      return await this.prisma.folder.create({
        data: payload,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getFolders(
    payload: GetFolderPayloadDto,
  ): Promise<GetFolderResponseDto> {
    try {
      const { page, limit, userId, name } = payload;
      const skip = (+page - 1) * +limit;
      const where: Prisma.FolderWhereInput = Object.assign(
        {},
        { userId },
        name && {
          name: {
            contains: name,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      );

      const [folders, total] = await this.prisma.$transaction([
        this.prisma.folder.findMany({
          where,
          skip,
          take: +limit,
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
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async renameFolder(folderId: string, newName: string): Promise<FolderDto> {
    try {
      const folder = await this.prisma.folder.findUnique({
        where: { id: folderId },
        select: { name: true },
      });

      if (!folder)
        throw new NotFoundException(`Folder with id ${folderId} not found`);

      return await this.prisma.folder.update({
        where: { id: folderId },
        data: { name: newName },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFolder(folderId: string): Promise<FolderDto> {
    try {
      return await this.prisma.folder.delete({
        where: { id: folderId },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
