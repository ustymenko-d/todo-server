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
export class TaskOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const taskId = request.params.taskId || request.body.id;

    if (!userId || !taskId)
      throw new BadRequestException('Invalid request parameters');

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true },
    });

    if (!task) throw new NotFoundException('Task not found');

    if (task.userId !== userId)
      throw new ForbiddenException(
        `Current user (${userId}) do not own this task`,
      );

    return true;
  }
}
