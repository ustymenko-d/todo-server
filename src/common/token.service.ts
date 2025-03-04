import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { RefreshTokenPayloadDto, UserDto } from 'src/auth/auth.dto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private logAndThrowError(message: string, error: any) {
    this.logger.error(message, error.stack);
    throw error;
  }

  createAccessToken(user: UserDto): string {
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
      this.logAndThrowError('Failed to create refresh token', error);
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

  createPasswordResetToken(user: UserDto): string {
    try {
      return this.jwtService.sign(
        { userId: user.id, tokenVersion: user.tokenVersion },
        { secret: process.env.JWT_RESET_SECRET, expiresIn: '30m' },
      );
    } catch (error) {
      this.logAndThrowError('Failed to create reset password token', error);
    }
  }

  verifyPasswordResetToken(resetToken: string): {
    userId: string;
    email: string;
    tokenVersion: number;
  } {
    try {
      return this.jwtService.verify(resetToken, {
        secret: process.env.JWT_RESET_SECRET,
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
