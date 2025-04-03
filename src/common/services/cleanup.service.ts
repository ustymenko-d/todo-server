import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  private logAndThrowError(message: string, error: any) {
    this.logger.error(message, error.stack);
    throw error;
  }

  private async cleanupEntities(
    entityName: string,
    conditions: any,
  ): Promise<void> {
    try {
      this.logger.log(`Starting cleanup for ${entityName}...`);

      const entitiesToCleanup = await this.prisma[entityName].findMany({
        where: conditions,
      });

      this.logger.log(
        `Found ${entitiesToCleanup.length} ${entityName} to clean up`,
      );

      if (entitiesToCleanup.length > 0) {
        const { count } = await this.prisma[entityName].deleteMany({
          where: conditions,
        });
        this.logger.log(`Deleted ${count} ${entityName}`);
      } else {
        this.logger.log(`No ${entityName} to clean up.`);
      }
    } catch (error) {
      this.logAndThrowError(`Failed to clean up ${entityName}`, error);
    }
  }

  private async cleanupTokens(): Promise<void> {
    const conditions = {
      OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }],
    };
    await this.cleanupEntities('RefreshToken', conditions);
  }

  private async cleanupUnverifiedUsers(): Promise<void> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const conditions = { isVerified: false, createdAt: { lt: threeDaysAgo } };
    await this.cleanupEntities('User', conditions);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyCleaning(): Promise<void> {
    this.logger.log('Starting daily cleaning...');
    await this.cleanupTokens();
    await this.cleanupUnverifiedUsers();
    this.logger.log('Daily cleaning is completed');
  }
}
