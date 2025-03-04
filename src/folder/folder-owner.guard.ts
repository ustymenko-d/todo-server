import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FolderOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { userId, folderId } = this.extractRequestParams(context);

    if (!userId || !folderId)
      throw new BadRequestException('Invalid request parameters');

    const folder = await this.findFolderById(folderId);

    if (folder.userId !== userId)
      throw new ForbiddenException(
        `User with ID (${userId}) doesn't own this folder`,
      );

    return true;
  }

  private extractRequestParams(context: ExecutionContext): {
    userId: string;
    folderId: string;
  } {
    const request = context.switchToHttp().getRequest();
    return {
      userId: request.user.userId,
      folderId: request.params.folderId,
    };
  }

  private async findFolderById(folderId: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { userId: true },
    });

    if (!folder) throw new NotFoundException('Folder not found');

    return folder;
  }
}
