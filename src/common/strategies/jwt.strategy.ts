import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.access_token || null,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    tokenVersion: number;
  }) {
    if (!this.isPayloadValid(payload)) {
      this.logger.warn('Invalid JWT payload');
      throw new UnauthorizedException('Invalid JWT payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tokenVersion: true, email: true },
    });

    if (!user) {
      this.logger.warn(`User not found (ID: ${payload.sub})`);
      throw new UnauthorizedException(`User not found(ID: ${payload.sub})`);
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      this.logger.warn(`Token version mismatch for user ID: ${payload.sub}`);
      throw new UnauthorizedException('Invalid token version');
    }

    return {
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    };
  }

  private isPayloadValid(payload: {
    sub: string;
    email: string;
    tokenVersion: number;
  }): boolean {
    return (
      !!payload?.sub && !!payload?.email && payload?.tokenVersion !== undefined
    );
  }
}
