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
export class FolderOwner implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { userId, folderId } = this.extractRequestParams(context);

    if (!userId || !folderId)
      throw new BadRequestException('Invalid request parameters');

    await this.verifyFolderOwnership(userId, folderId);
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

  private async verifyFolderOwnership(
    userId: string,
    folderId: string,
  ): Promise<void> {
    const ownerId = await this.findFolderOwner(folderId);

    if (ownerId !== userId)
      throw new ForbiddenException(
        `User with ID (${userId}) doesn't own this folder`,
      );
  }

  private async findFolderOwner(id: string): Promise<string> {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!folder) throw new NotFoundException('Folder not found');

    return folder.userId;
  }
}
