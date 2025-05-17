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
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request?.user?.userId;
    const folderId: string | undefined = request?.params?.folderId;

    if (!userId || !folderId)
      throw new BadRequestException('Missing userId or folderId in request');

    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { userId: true },
    });

    if (!folder) throw new NotFoundException('Folder not found');

    if (folder.userId !== userId)
      throw new ForbiddenException(`Access denied to folder ${folderId}`);

    return true;
  }
}
