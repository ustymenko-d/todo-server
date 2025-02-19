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
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const folderId = request.params.folderId;

    if (!userId || !folderId)
      throw new BadRequestException('Invalid request parameters');

    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { userId: true },
    });

    if (!folder) throw new NotFoundException('Folder not found');

    if (folder.userId !== userId)
      throw new ForbiddenException(
        `Current user (${userId}) do not own this folder`,
      );

    return true;
  }
}
