import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { RefreshTokenDto, TokenPairDto, UserDto } from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async createUser(email: string, hashedPassword: string) {
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: email.split('@')[0],
        tokenVersion: 1,
      },
    });
  }

  private async comparePasswords(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }

  private async incrementTokenVersion(user: UserDto): Promise<UserDto> {
    const { id, tokenVersion } = user;

    await this.prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });

    return { ...user, tokenVersion: tokenVersion + 1 };
  }

  private createToken(user: UserDto) {
    const payload = {
      email: user.email,
      sub: user.id,
      tokenVersion: user.tokenVersion,
    };

    return this.jwtService.sign(payload);
  }

  private async createRefreshToken(userId: string): Promise<string> {
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

  private async revokePreviousTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  async signup(email: string, password: string): Promise<TokenPairDto> {
    try {
      const hashedPassword = await this.hashPassword(password);
      const user = await this.createUser(email, hashedPassword);
      const refreshToken = await this.createRefreshToken(user.id);
      const accessToken = this.createToken(user);

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Signup failed', error.stack);
      throw new UnauthorizedException('Registration failed');
    }
  }

  async login(email: string, password: string): Promise<TokenPairDto> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user || !(await this.comparePasswords(password, user.password)))
        throw new UnauthorizedException('Invalid credentials');

      const updatedUser = await this.incrementTokenVersion(user);

      await this.revokePreviousTokens(user.id);

      const refreshToken = await this.createRefreshToken(user.id);
      const accessToken = this.createToken(updatedUser);

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Login failed', error.stack);
      throw new UnauthorizedException('Login failed');
    }
  }

  async logout(userId: string) {
    await this.revokePreviousTokens(userId);
  }

  async deleteUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) throw new UnauthorizedException('User not found');

      await this.prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      this.logger.error('User deletion failed', error.stack);
      throw new UnauthorizedException('User deletion failed');
    }
  }

  async validateRefreshToken(
    userId: string,
    token: string,
  ): Promise<RefreshTokenDto> {
    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    });

    if (!refreshToken)
      throw new UnauthorizedException('Invalid or expired refresh token');

    const isValid = await bcrypt.compare(token, refreshToken.token);

    if (!isValid)
      throw new UnauthorizedException('Invalid or expired refresh token');

    return refreshToken;
  }

  async refreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<TokenPairDto> {
    try {
      await this.validateRefreshToken(userId, refreshToken);
      await this.revokePreviousTokens(userId);

      const newRefreshToken = await this.createRefreshToken(userId);
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) throw new UnauthorizedException('User not found');

      const updatedUser = await this.incrementTokenVersion(user);
      const newAccessToken = this.createToken(updatedUser);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      this.logger.error('Refresh token failed', error.stack);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async cleanUpExpiredTokens() {
    this.logger.log('Starting token cleanup...');
    try {
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
