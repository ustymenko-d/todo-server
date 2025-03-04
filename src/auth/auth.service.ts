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
  RefreshTokenPayloadDto,
  TokenPair,
  UserDto,
} from './auth.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MailService } from 'src/common/mail.service';
import { PasswordService } from 'src/common/password.service';
import { TokenService } from 'src/common/token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly passwordService: PasswordService,
  ) {}

  private handleError(error: any, errorMessage: string): void {
    this.logger.error(error.stack || error);
    throw new InternalServerErrorException(errorMessage);
  }

  private async getUserById(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

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
      this.handleError(error, 'Creating user failed');
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

  private async revokeTokensAndUpdateUser(userId: string): Promise<UserDto> {
    await this.tokenService.revokePreviousTokens(userId);
    const user = await this.getUserById(userId);
    return this.incrementTokenVersion(user);
  }

  async signup({ email, password }: AuthBaseDto): Promise<TokenPair> {
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
      const refreshToken = await this.tokenService.createRefreshToken(user.id);
      const accessToken = this.tokenService.createAccessToken(user);

      await this.mailService.sendVerificationEmail({
        email,
        verificationToken,
      });

      return { accessToken, refreshToken };
    } catch (error) {
      this.handleError(error, 'Signup failed');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { verificationToken: token },
      });

      if (!user) throw new UnauthorizedException('User not found');

      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, verificationToken: null },
      });
    } catch (error) {
      this.handleError(error, 'Email verification failed');
    }
  }

  async login({ email, password }: AuthBaseDto): Promise<TokenPair> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (
        !user ||
        !(await this.passwordService.comparePasswords(password, user.password))
      )
        throw new UnauthorizedException('Invalid credentials');

      const updatedUser = await this.revokeTokensAndUpdateUser(user.id);
      const refreshToken = await this.tokenService.createRefreshToken(
        updatedUser.id,
      );
      const accessToken = this.tokenService.createAccessToken(updatedUser);

      return { accessToken, refreshToken };
    } catch (error) {
      this.handleError(error, 'Login failed');
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      await this.revokeTokensAndUpdateUser(userId);
    } catch (error) {
      this.handleError(error, 'Logout failed');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      await this.prisma.user.delete({ where: { id: user.id } });
    } catch (error) {
      this.handleError(error, 'Delete user failed');
    }
  }

  async sendPasswordResetEmail({ email }: EmailBaseDto): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) throw new UnauthorizedException('User not found');
      const resetToken = this.tokenService.createPasswordResetToken(user);
      await this.mailService.sendPasswordResetEmail({ email, resetToken });
      this.logger.log(`Reset password email sent to ${email}`);
    } catch (error) {
      this.handleError(error, 'Password reset email send failed');
    }
  }

  async resetPassword({
    resetToken,
    password,
  }: {
    resetToken: string;
    password: string;
  }): Promise<void> {
    try {
      const { userId, tokenVersion } =
        this.tokenService.verifyPasswordResetToken(resetToken);
      const user = await this.prisma.user.findUnique({
        where: { id: userId, tokenVersion },
      });

      if (!user) throw new UnauthorizedException('User not found');

      const hashedPassword = await this.passwordService.hashPassword({
        password,
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, tokenVersion: { increment: 1 } },
      });
    } catch (error) {
      this.handleError(error, 'Password reset failed');
    }
  }

  async refreshToken({
    userId,
    refreshToken,
  }: RefreshTokenPayloadDto): Promise<TokenPair> {
    try {
      await this.tokenService.validateRefreshToken({ userId, refreshToken });
      await this.tokenService.revokePreviousTokens(userId);

      const newRefreshToken =
        await this.tokenService.createRefreshToken(userId);
      const user = await this.getUserById(userId);

      const updatedUser = await this.incrementTokenVersion(user);
      const newAccessToken = this.tokenService.createAccessToken(updatedUser);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      this.handleError(error, 'Refresh token failed');
    }
  }
}
