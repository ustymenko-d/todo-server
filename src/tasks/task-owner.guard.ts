import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TaskOwnerGuard implements CanActivate {
  private readonly logger = new Logger(TaskOwnerGuard.name);
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const taskId = request.params.taskId;

    if (!userId || !taskId) {
      this.logger.warn('Invalid request parameters');
      throw new UnauthorizedException('Invalid request parameters');
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true },
    });

    if (!task) {
      this.logger.warn('Task not found');
      throw new UnauthorizedException('Task not found');
    }

    if (task.userId !== userId) {
      this.logger.warn(`Current user (${userId}) do not own this task`);
      throw new UnauthorizedException(
        `Current user (${userId}) do not own this task`,
      );
    }

    return true;
  }
}
