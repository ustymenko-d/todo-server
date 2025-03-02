import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.access_token || null,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  private readonly logger = new Logger(JwtStrategy.name);

  async validate(payload: {
    sub: string;
    email: string;
    tokenVersion: number;
  }) {
    if (
      !payload?.sub ||
      !payload?.email ||
      payload?.tokenVersion === undefined
    ) {
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
}
