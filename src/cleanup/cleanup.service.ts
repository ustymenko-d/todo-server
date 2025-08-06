import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaWhereInput } from 'src/common/common.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { AllCleanupTasks } from './cleanup.types';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly cleanupTasks: AllCleanupTasks[] = [
    {
      entity: 'refreshToken',
      conditionsProvider: () => this.getExpiredTokenConditions(),
    },
    {
      entity: 'user',
      conditionsProvider: () => this.getUnverifiedUserConditions(),
    },
  ];

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyCleanup() {
    this.logger.log('Starting daily cleanup...');

    await Promise.all(
      this.cleanupTasks.map(({ entity, conditionsProvider }) =>
        this.cleanup(entity, conditionsProvider()),
      ),
    );

    this.logger.log('Daily cleanup completed.');
  }

  private async cleanup<T extends keyof PrismaService>(
    entity: T,
    conditions: PrismaWhereInput<T>,
  ) {
    const entityName = String(entity);

    try {
      this.logger.log(`Starting cleanup for ${entityName}...`);

      const count = await this.prisma[entityName]
        .deleteMany({ where: conditions })
        .then((result: { count: number }) => result.count);

      this.logger.log(
        count > 0
          ? `Deleted ${count} ${entityName} records.`
          : `No ${entityName} records found for cleanup.`,
      );
    } catch (error) {
      this.logger.error(`Failed to clean up ${entityName}: `, error.stack);
      throw error;
    }
  }

  private getExpiredTokenConditions(): PrismaWhereInput<'refreshToken'> {
    return { OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }] };
  }

  private getUnverifiedUserConditions(): PrismaWhereInput<'user'> {
    return { isVerified: false, createdAt: { lt: this.getDateDaysAgo(3) } };
  }

  private getDateDaysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}
