import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenDto, UserDto } from 'src/auth/auth.dto';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly logger = new Logger(TokenService.name);

  createToken(user: UserDto) {
    const payload = {
      email: user.email,
      sub: user.id,
      tokenVersion: user.tokenVersion,
    };

    return this.jwtService.sign(payload);
  }

  async createRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const hashedToken = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt,
      },
    });

    return token;
  }

  async validateRefreshToken(
    userId: string,
    token: string,
  ): Promise<RefreshTokenDto> {
    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    });

    if (!refreshToken)
      throw new UnauthorizedException('No refresh token found');

    const isValid = await bcrypt.compare(token, refreshToken.token);

    if (!isValid)
      throw new UnauthorizedException('Invalid or expired refresh token');

    return refreshToken;
  }

  async revokePreviousTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  async cleanUpExpiredTokens() {
    try {
      this.logger.log('Starting token cleanup...');

      const expiredOrRevokedTokens = await this.prisma.refreshToken.findMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }],
        },
      });

      this.logger.log(
        `Found ${expiredOrRevokedTokens.length} tokens to clean up`,
      );

      if (expiredOrRevokedTokens.length > 0) {
        const result = await this.prisma.refreshToken.deleteMany({
          where: {
            OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }],
          },
        });
        this.logger.log(`Deleted ${result.count} expired or revoked tokens`);
      } else {
        this.logger.log('No tokens to clean up.');
      }
    } catch (error) {
      this.logger.error('Failed to clean up tokens', error.stack);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTokenCleanup() {
    this.logger.log('Running token cleanup job...');
    await this.cleanUpExpiredTokens();
    this.logger.log('Token cleanup job completed');
  }
}
