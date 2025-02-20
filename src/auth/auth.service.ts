import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  AuthBaseDto,
  EmailBaseDto,
  PasswordResetPayloadDto,
  RefreshTokenPayloadDto,
  TokenPairDto,
  UserDto,
  UserIdDto,
} from './auth.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MailService } from 'src/common/mail.service';
import { PasswordService } from 'src/common/password.service';
import { TokenService } from 'src/common/token.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly passwordService: PasswordService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  private async createUser(
    email: string,
    hashedPassword: string,
    hashedVerificationToken: string,
  ): Promise<UserDto> {
    try {
      return await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          username: email.split('@')[0],
          tokenVersion: 1,
          verificationToken: hashedVerificationToken,
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User with this email already exists');
      }
      throw new InternalServerErrorException('Creating user failed');
    }
  }

  private async incrementTokenVersion(user: UserDto): Promise<UserDto> {
    const { id, tokenVersion } = user;

    await this.prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });

    return { ...user, tokenVersion: tokenVersion + 1 };
  }

  async signup({ email, password }: AuthBaseDto): Promise<TokenPairDto> {
    try {
      const verificationToken = uuidv4();
      const hashedPassword = await this.passwordService.hashPassword({
        password,
      });
      const user = await this.createUser(
        email,
        hashedPassword,
        verificationToken,
      );
      const refreshToken = await this.tokenService.createRefreshToken({
        userId: user.id,
      });
      const accessToken = this.tokenService.createToken(user);

      await this.mailService.sendVerificationEmail({
        email,
        verificationToken,
      });

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(error);
      throw error;
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
      this.logger.error(error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<TokenPairDto> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (
        !user ||
        !(await this.passwordService.comparePasswords({
          password,
          hashedPassword: user.password,
        }))
      )
        throw new UnauthorizedException('Invalid credentials');

      const updatedUser = await this.incrementTokenVersion(user);
      await this.tokenService.revokePreviousTokens({ userId: user.id });

      const refreshToken = await this.tokenService.createRefreshToken({
        userId: user.id,
      });
      const accessToken = this.tokenService.createToken(updatedUser);

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async logout({ userId }: UserIdDto): Promise<void> {
    try {
      await this.tokenService.revokePreviousTokens({ userId });
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedException('User not found');
      await this.incrementTokenVersion(user);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) throw new UnauthorizedException('User not found');

      await this.prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }

  async sendPasswordResetEmail({ email }: EmailBaseDto): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) throw new UnauthorizedException('User not found');

      const resetToken = await this.tokenService.createPasswordResetToken(user);

      this.mailService.sendPasswordResetEmail({ email, resetToken });

      this.logger.log(`Reset password email sent to ${email}`);
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }

  async resetPassword({
    resetToken,
    password,
  }: PasswordResetPayloadDto): Promise<void> {
    try {
      const { userId, tokenVersion } =
        this.tokenService.verifyPasswordResetToken(resetToken);

      const user = await this.prisma.user.findUnique({
        where: { id: userId, tokenVersion },
      });

      if (!user) throw new UnauthorizedException('Invalid token');

      const hashedPassword = await this.passwordService.hashPassword({
        password,
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, tokenVersion: { increment: 1 } },
      });
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }

  async refreshToken({
    userId,
    refreshToken,
  }: RefreshTokenPayloadDto): Promise<TokenPairDto> {
    try {
      await this.tokenService.validateRefreshToken({ userId, refreshToken });
      await this.tokenService.revokePreviousTokens({ userId });

      const newRefreshToken = await this.tokenService.createRefreshToken({
        userId,
      });
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) throw new UnauthorizedException('User not found');

      const updatedUser = await this.incrementTokenVersion(user);
      const newAccessToken = this.tokenService.createToken(updatedUser);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteUnverifiedUsers(): Promise<void> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count } = await this.prisma.user.deleteMany({
      where: {
        isVerified: false,
        createdAt: { lt: oneWeekAgo },
      },
    });

    this.logger.log(`Deleted ${count} unverified users`);
  }
}
