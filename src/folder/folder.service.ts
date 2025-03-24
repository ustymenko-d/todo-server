import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestHandlerService } from 'src/common/request-handler.service';
import {
  ICreateFolderPayload,
  IFolder,
  IGetFolderPayload,
  IGetFolderResponse,
} from './folder.types';

@Injectable()
export class FolderService {
  constructor(
    private prisma: PrismaService,
    private readonly requestHandlerService: RequestHandlerService,
  ) {}

  async createFolder(payload: ICreateFolderPayload): Promise<IFolder> {
    return this.requestHandlerService.handleRequest(
      async () => {
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

        return await this.prisma.folder.create({ data: payload });
      },
      'Error while creating folder',
      true,
    );
  }

  async getFolders(payload: IGetFolderPayload): Promise<IGetFolderResponse> {
    return this.requestHandlerService.handleRequest(
      async () => {
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
      },
      'Error while fetching folders',
      true,
    );
  }

  async renameFolder(id: string, name: string): Promise<IFolder> {
    return this.requestHandlerService.handleRequest(
      async () => {
        const folder = await this.prisma.folder.findUnique({
          where: { id },
          select: { name: true },
        });

        if (!folder)
          throw new NotFoundException(`Folder with id ${id} not found`);

        return await this.prisma.folder.update({
          where: { id },
          data: { name },
        });
      },
      'Error while renaming folder',
      true,
    );
  }

  async deleteFolder(id: string): Promise<IFolder> {
    return this.requestHandlerService.handleRequest(
      async () => await this.prisma.folder.delete({ where: { id } }),
      'Error while deleting folder',
      true,
    );
  }

  private buildFolderWhereInput(
    payload: IGetFolderPayload,
  ): Prisma.FolderWhereInput {
    const { userId, name } = payload;
    return Object.assign(
      {},
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
