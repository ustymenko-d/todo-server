import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  JwtUserDto,
  RefreshTokenPayloadDto,
  UserDto,
  UserIdDto,
} from 'src/auth/auth.dto';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly logger = new Logger(TokenService.name);

  createToken(user: UserDto): string {
    try {
      const payload = {
        email: user.email,
        sub: user.id,
        tokenVersion: user.tokenVersion,
      };

      return this.jwtService.sign(payload);
    } catch (error) {
      this.logger.error('Failed to create access token', error.stack);
      throw error;
    }
  }

  decodeAccessToken(accessToken: string): {
    email: string;
    sub: string;
    tokenVersion: number;
    iat: number;
    exp: number;
  } {
    return this.jwtService.decode(accessToken);
  }

  async createRefreshToken({ userId }: UserIdDto): Promise<string> {
    try {
      const token = uuidv4();
      const hashedToken = await bcrypt.hash(token, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await this.prisma.refreshToken.create({
        data: {
          userId,
          token: hashedToken,
          expiresAt,
        },
      });

      return token;
    } catch (error) {
      this.logger.error('Failed to create refresh token', error.stack);
      throw error;
    }
  }

  async validateRefreshToken({
    userId,
    refreshToken,
  }: RefreshTokenPayloadDto): Promise<void> {
    const storedRefreshToken = await this.prisma.refreshToken.findFirst({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    });

    if (!storedRefreshToken)
      throw new UnauthorizedException('No refresh token found');

    const isValid = await bcrypt.compare(
      refreshToken,
      storedRefreshToken.token,
    );

    if (!isValid)
      throw new UnauthorizedException('Invalid or expired refresh token');
  }

  async revokePreviousTokens({ userId }: UserIdDto): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    } catch (error) {
      this.logger.error('Failed to revoke previous tokens', error.stack);
      throw error;
    }
  }

  createPasswordResetToken(user: UserDto): string {
    try {
      return this.jwtService.sign(
        { userId: user.id, tokenVersion: user.tokenVersion },
        { secret: process.env.JWT_RESET_SECRET, expiresIn: '30m' },
      );
    } catch (error) {
      this.logger.error('Failed to create reset password token', error.stack);
      throw error;
    }
  }

  verifyPasswordResetToken(resetToken: string): JwtUserDto {
    try {
      return this.jwtService.verify(resetToken, {
        secret: process.env.JWT_RESET_SECRET,
      });
    } catch (error) {
      this.logger.error('Failed to verify reset password token', error.stack);
      throw error;
    }
  }

  extractUserIdFromToken(accessToken: string): string {
    try {
      const decodedToken = this.decodeAccessToken(accessToken);
      const userId = decodedToken?.sub;
      if (!userId) throw new UnauthorizedException('Missing user id');
      return userId;
    } catch {
      throw new UnauthorizedException('Error during access token decoding');
    }
  }

  async cleanUpExpiredTokens(): Promise<void> {
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
