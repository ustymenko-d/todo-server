import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default_secret',
    });
  }

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
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tokenVersion: true, email: true },
    });

    if (!user) {
      this.logger.warn(`User not found (ID: ${payload.sub})`);
      throw new UnauthorizedException('User not found');
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
