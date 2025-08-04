import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { ITokenPair, IUser } from 'src/auth/auth.types';
import { IJwtUser } from '../../common/common.types';
import { AuthService } from '../auth.service';
import HashHandler from 'src/common/utils/HashHandler';

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  decodeAccessToken(accessToken: string): {
    userId: string;
    sessionId: string;
  } {
    const decodedToken = this.jwtService.decode(accessToken);
    const { sub: userId, sessionId } = decodedToken;
    return { userId, sessionId };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
    sessionId: string,
  ): Promise<ITokenPair> {
    await this.verifyRefreshToken(userId, refreshToken, sessionId);

    const user = await this.authService.findUserBy({ id: userId });
    const newAccessToken = this.createAccessToken(user, sessionId);

    await this.revokePreviousTokens(userId, sessionId);

    const newRefreshToken = await this.createRefreshToken(userId, sessionId);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // --- Helper methods ---

  createAccessToken(user: IUser, sessionId: string): string {
    const { email, id: sub, tokenVersion } = user;
    const payload = {
      email,
      sub,
      tokenVersion,
      sessionId,
    };
    return this.jwtService.sign(payload);
  }

  async createRefreshToken(userId: string, sessionId: string): Promise<string> {
    const token = uuidv4();
    const hashedToken = await HashHandler.hashString(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt,
        sessionId,
      },
    });

    return token;
  }

  async verifyRefreshToken(
    userId: string,
    refreshToken: string,
    sessionId: string,
  ) {
    const { token } = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        sessionId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!token) throw new UnauthorizedException('No refresh token found.');

    const isTokenValid = await HashHandler.compareString(refreshToken, token);

    if (!isTokenValid)
      throw new UnauthorizedException('Invalid or expired refresh token.');
  }

  async revokePreviousTokens(userId: string, sessionId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, sessionId, revoked: false },
      data: { revoked: true },
    });
  }

  createResetPasswordToken(user: IUser): string {
    return this.jwtService.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      {
        secret: this.configService.get<string>('JWT_RESET_SECRET'),
        expiresIn: '30m',
      },
    );
  }

  verifyResetPasswordToken(resetToken: string): IJwtUser {
    return this.jwtService.verify(resetToken, {
      secret: this.configService.get<string>('JWT_RESET_SECRET'),
    });
  }
}
