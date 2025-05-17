import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type CleanupConditions<T extends keyof PrismaService> = T extends 'refreshToken'
  ? Prisma.RefreshTokenWhereInput
  : T extends 'user'
    ? Prisma.UserWhereInput
    : never;

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyCleaning() {
    this.logger.log('Starting daily cleaning...');

    await this.executeCleanup([
      { entity: 'refreshToken', conditions: this.getExpiredTokenConditions() },
      { entity: 'user', conditions: this.getUnverifiedUserConditions() },
    ]);

    this.logger.log('Daily cleaning is completed');
  }

  private async executeCleanup<T extends keyof PrismaService>(
    tasks: { entity: T; conditions: CleanupConditions<T> }[],
  ) {
    await Promise.all(
      tasks.map(({ entity, conditions }) => this.cleanup(entity, conditions)),
    );
  }

  private async cleanup<T extends keyof PrismaService>(
    entity: T,
    conditions: CleanupConditions<T>,
  ) {
    const entityString = String(entity);
    try {
      this.logger.log(`Starting cleanup for ${entityString}...`);

      const count = await this.prisma[entityString]
        .deleteMany({ where: conditions })
        .then((result) => result.count);

      this.logger.log(
        count > 0
          ? `Deleted ${count} ${entityString} records.`
          : `No ${entityString} records found for cleanup.`,
      );
    } catch (error) {
      this.logger.error(`Failed to clean up ${entityString}:`, error.stack);
      throw error;
    }
  }

  private getExpiredTokenConditions(): CleanupConditions<'refreshToken'> {
    return { OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }] };
  }

  private getUnverifiedUserConditions(): CleanupConditions<'user'> {
    return { isVerified: false, createdAt: { lt: this.getDateDaysAgo(3) } };
  }

  private getDateDaysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
