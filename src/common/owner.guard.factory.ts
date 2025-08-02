import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Type,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { WhereUniqueInput } from './common.types';
import { Request } from 'express';

export function OwnerGuardFactory<T extends keyof DatabaseService>(
  entityName: T,
  getId: (req: Request) => string | undefined,
): Type<CanActivate> {
  @Injectable()
  class OwnerGuard implements CanActivate {
    constructor(private readonly prisma: DatabaseService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const userId = request?.user?.userId;
      const entityId = getId(request);
      const entity = String(entityName);

      if (!userId || !entityId) {
        throw new BadRequestException(
          `Missing userId or ${entity}Id in request.`,
        );
      }

      const whereCondition: WhereUniqueInput<T> = {
        id: entityId,
      } as WhereUniqueInput<T>;

      const record = await this.prisma[entity].findUnique({
        where: whereCondition,
        select: { userId: true },
      });

      if (!record) {
        throw new NotFoundException(`${capitalize(entity)} not found.`);
      }

      if (record.userId !== userId) {
        throw new ForbiddenException(
          `Access denied to ${entity} (ID: ${entityId}).`,
        );
      }

      return true;
    }
  }

  return OwnerGuard;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
