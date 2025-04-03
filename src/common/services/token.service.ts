import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { IUser } from 'src/auth/auth.types';
import { IJwtUser } from '../common.types';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private logAndThrowError(message: string, error: any) {
    this.logger.error(message, error.stack);
    throw error;
  }

  createAccessToken(user: IUser): string {
    try {
      const payload = {
        email: user.email,
        sub: user.id,
        tokenVersion: user.tokenVersion,
      };
      return this.jwtService.sign(payload);
    } catch (error) {
      this.logAndThrowError('Failed to create access token', error);
    }
  }

  async createRefreshToken(userId: string): Promise<string> {
    try {
      const token = uuidv4();
      const hashedToken = await bcrypt.hash(token, 10);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);

      await this.prisma.refreshToken.create({
        data: {
          userId,
          token: hashedToken,
          expiresAt,
        },
      });

      return token;
    } catch (error) {
      this.logAndThrowError('Failed to create refresh token', error);
    }
  }

  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
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

  async revokePreviousTokens(userId: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    } catch (error) {
      this.logAndThrowError('Failed to revoke previous tokens', error);
    }
  }

  createResetPasswordToken(user: IUser): string {
    try {
      return this.jwtService.sign(
        { userId: user.id, tokenVersion: user.tokenVersion },
        {
          secret: this.configService.get<string>('JWT_RESET_SECRET'),
          expiresIn: '30m',
        },
      );
    } catch (error) {
      this.logAndThrowError('Failed to create reset password token', error);
    }
  }

  verifyResetPasswordToken(resetToken: string): IJwtUser {
    try {
      return this.jwtService.verify(resetToken, {
        secret: this.configService.get<string>('JWT_RESET_SECRET'),
      });
    } catch (error) {
      this.logAndThrowError('Failed to verify reset password token', error);
    }
  }

  extractUserIdFromToken(accessToken: string): string {
    try {
      const decodedToken = this.jwtService.decode(accessToken);
      const userId = decodedToken?.sub;
      if (!userId) throw new UnauthorizedException('Missing user id');
      return userId;
    } catch {
      throw new UnauthorizedException('Error during access token decoding');
    }
  }
}
