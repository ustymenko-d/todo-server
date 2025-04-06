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
import * as bcrypt from 'bcrypt';
import { ITokenPair, IUser } from 'src/auth/auth.types';
import { IJwtUser } from '../../common/common.types';
import { AuthService } from '../auth.service';
import { ClientMeta } from 'src/common/utils/getClientMeta';

@Injectable()
export class TokensService {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  createAccessToken(user: IUser): string {
    const payload = {
      email: user.email,
      sub: user.id,
      tokenVersion: user.tokenVersion,
    };
    return this.jwtService.sign(payload);
  }

  async createRefreshToken(userId: string, meta: ClientMeta): Promise<string> {
    const token = uuidv4();
    const hashedToken = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);
    const { userAgent, ipAddress } = meta;

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return token;
  }

  async refreshTokens(
    id: string,
    refreshToken: string,
    meta: ClientMeta,
  ): Promise<ITokenPair> {
    await this.verifyRefreshToken(id, refreshToken, meta);
    const user = await this.authService.findUserBy({ id });
    const newAccessToken = this.createAccessToken(user);
    await this.revokePreviousTokens(id, meta);
    const newRefreshToken = await this.createRefreshToken(id, meta);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async verifyRefreshToken(
    userId: string,
    refreshToken: string,
    meta: ClientMeta,
  ): Promise<void> {
    const { userAgent, ipAddress } = meta;
    const storedRefreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
        userAgent,
        ipAddress,
      },
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

  async revokePreviousTokens(userId: string, meta?: ClientMeta): Promise<void> {
    const { userAgent, ipAddress } = meta || {};
    const where = Object.assign(
      { userId, revoked: false },
      userAgent && { userAgent },
      ipAddress && { ipAddress },
    );
    await this.prisma.refreshToken.updateMany({
      where,
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

  extractUserIdFromToken(accessToken: string): string {
    const decodedToken = this.jwtService.decode(accessToken);
    const userId = decodedToken?.sub;
    if (!userId) throw new UnauthorizedException('Missing user id');
    return userId;
  }
}
