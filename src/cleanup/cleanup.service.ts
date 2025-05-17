import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaWhereInput } from 'src/common/common.types';
import { PrismaService } from 'src/prisma/prisma.service';

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

    this.logger.log('Daily cleaning is completed.');
  }

  private async executeCleanup<T extends keyof PrismaService>(
    tasks: { entity: T; conditions: PrismaWhereInput<T> }[],
  ) {
    await Promise.all(
      tasks.map(({ entity, conditions }) => this.cleanup(entity, conditions)),
    );
  }

  private async cleanup<T extends keyof PrismaService>(
    entity: T,
    conditions: PrismaWhereInput<T>,
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
      this.logger.error(`Failed to clean up ${entityString}: `, error.stack);
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
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
