import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import {
  PasswordBaseDto,
  RefreshTokenDto,
  TokenPairDto,
  UserDto,
} from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  private async createUser(
    email: string,
    hashedPassword: string,
    hashedVerificationToken: string,
  ) {
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: email.split('@')[0],
        tokenVersion: 1,
        verificationToken: hashedVerificationToken,
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

  private async sendVerificationEmail(
    email: string,
    verificationToken: string,
  ) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const verificationUrl = `${process.env.FRONTEND_URL}/auth/verification?token=${verificationToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Verify your email on ${process.env.FRONTEND_URL}`,
        html: `<p>Please click <a href="${verificationUrl}">this link</a> to verify your email.</p>`,
      });
    } catch (error) {
      this.logger.error('Send verification email failed', error.stack);
      throw new UnauthorizedException('Send verification email failed');
    }
  }

  async signup(email: string, password: string): Promise<TokenPairDto> {
    try {
      const verificationToken = uuidv4();
      const hashedPassword = await this.hashData(password);
      const user = await this.createUser(
        email,
        hashedPassword,
        verificationToken,
      );
      const refreshToken = await this.createRefreshToken(user.id);
      const accessToken = this.createToken(user);

      await this.sendVerificationEmail(email, verificationToken);

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Signup failed', error.stack);
      throw new UnauthorizedException('Registration failed');
    }
  }

  async verifyEmail(token: string): Promise<UserDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { verificationToken: token },
      });

      if (!user) throw new UnauthorizedException('User not found');

      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, verificationToken: null },
      });

      return user;
    } catch (error) {
      this.logger.error('Email verification failed', error.stack);
      throw new UnauthorizedException('Email verification failed');
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
    try {
      await this.revokePreviousTokens(userId);

      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) throw new UnauthorizedException('User not found');

      await this.incrementTokenVersion(user);
    } catch (error) {
      this.logger.error('Logout failed', error.stack);
      throw new UnauthorizedException('Logout failed');
    }
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

  async sendResetPasswordEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) throw new UnauthorizedException('User not found');

      const resetToken = this.jwtService.sign(
        { userId: user.id, tokenVersion: user.tokenVersion },
        { secret: process.env.JWT_RESET_SECRET, expiresIn: '15m' },
      );

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Reset Your Password on ${process.env.FRONTEND_URL}`,
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link is valid for 15 minutes.</p>`,
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error('Password reset email sent failed', error.stack);
      throw new UnauthorizedException('Password reset email sent failed');
    }
  }

  async resetPassword(token: string, newPasswordDto: PasswordBaseDto) {
    try {
      const { userId, tokenVersion } = this.jwtService.verify(token, {
        secret: process.env.JWT_RESET_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId, tokenVersion },
      });

      if (!user) throw new UnauthorizedException('User not found');

      const hashedPassword = await this.hashData(newPasswordDto.password);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, tokenVersion: { increment: 1 } },
      });
    } catch (error) {
      this.logger.error('Reset password failed', error.stack);
      throw new UnauthorizedException('Reset password failed');
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
