import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { IAuthData, ITokenPair, IUser, IUserInfo } from './auth.types';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MailService } from 'src/common/mail.service';
import { PasswordService } from 'src/common/password.service';
import { TokenService } from 'src/common/token.service';
import { RequestHandlerService } from 'src/common/request-handler.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly passwordService: PasswordService,
    private readonly requestHandlerService: RequestHandlerService,
  ) {}

  private async getUserById(userId: string): Promise<IUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private async createUser(
    email: string,
    hashedPassword: string,
    hashedVerificationToken: string,
  ): Promise<IUser> {
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

  private async incrementTokenVersion(user: IUser): Promise<IUser> {
    const { id, tokenVersion } = user;

    await this.prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });

    return { ...user, tokenVersion: tokenVersion + 1 };
  }

  private async revokeTokensAndUpdateUser(userId: string): Promise<IUser> {
    await this.tokenService.revokePreviousTokens(userId);
    const user = await this.getUserById(userId);
    return this.incrementTokenVersion(user);
  }

  private createUserData({
    id,
    email,
    username,
    createdAt,
    isVerified,
  }: IUser): IUserInfo {
    return { id, email, username, createdAt, isVerified };
  }

  async signup(email: string, password: string): Promise<IAuthData> {
    return this.requestHandlerService.handleRequest(
      async () => {
        const verificationToken = uuidv4();
        const hashedPassword =
          await this.passwordService.hashPassword(password);
        const user = await this.createUser(
          email,
          hashedPassword,
          verificationToken,
        );
        const refreshToken = await this.tokenService.createRefreshToken(
          user.id,
        );
        const accessToken = this.tokenService.createAccessToken(user);
        const userInfo = this.createUserData(user);
        await this.mailService.sendVerificationEmail(email, verificationToken);
        return { accessToken, refreshToken, userInfo };
      },
      'Signup failed',
      true,
    );
  }

  async verifyEmail(token: string): Promise<void> {
    return this.requestHandlerService.handleRequest(
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { verificationToken: token },
        });

        if (!user) throw new UnauthorizedException('User not found');

        await this.prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true, verificationToken: null },
        });
      },
      'Email verification failed',
      true,
    );
  }

  async login(email: string, password: string): Promise<IAuthData> {
    return this.requestHandlerService.handleRequest(
      async () => {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (
          !user ||
          !(await this.passwordService.comparePasswords(
            password,
            user.password,
          ))
        )
          throw new UnauthorizedException('Invalid credentials');

        const updatedUser = await this.revokeTokensAndUpdateUser(user.id);
        const refreshToken = await this.tokenService.createRefreshToken(
          updatedUser.id,
        );
        const accessToken = this.tokenService.createAccessToken(updatedUser);
        const userInfo = this.createUserData(updatedUser);

        return { accessToken, refreshToken, userInfo };
      },
      'Login failed',
      true,
    );
  }

  async logout(userId: string): Promise<void> {
    return this.requestHandlerService.handleRequest(
      async () => {
        await this.revokeTokensAndUpdateUser(userId);
      },
      'Logout failed',
      true,
    );
  }

  async deleteUser(userId: string): Promise<void> {
    return this.requestHandlerService.handleRequest(
      async () => {
        const user = await this.getUserById(userId);
        await this.prisma.user.delete({ where: { id: user.id } });
      },
      'Delete user failed',
      true,
    );
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    return this.requestHandlerService.handleRequest(
      async () => {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) throw new UnauthorizedException('User not found');
        const resetToken = this.tokenService.createPasswordResetToken(user);
        await this.mailService.sendPasswordResetEmail(email, resetToken);
      },
      'Password reset email send failed',
      true,
    );
  }

  async resetPassword(resetToken: string, password: string): Promise<void> {
    return this.requestHandlerService.handleRequest(
      async () => {
        const { userId, tokenVersion } =
          this.tokenService.verifyPasswordResetToken(resetToken);
        const user = await this.prisma.user.findUnique({
          where: { id: userId, tokenVersion },
        });

        if (!user)
          throw new UnauthorizedException('User not found or invalid token');

        const hashedPassword =
          await this.passwordService.hashPassword(password);

        await this.prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword, tokenVersion: { increment: 1 } },
        });
      },
      'Password reset failed',
      true,
    );
  }

  async refreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<ITokenPair> {
    return this.requestHandlerService.handleRequest(
      async () => {
        await this.tokenService.validateRefreshToken(userId, refreshToken);
        await this.tokenService.revokePreviousTokens(userId);

        const newRefreshToken =
          await this.tokenService.createRefreshToken(userId);
        const user = await this.getUserById(userId);

        const updatedUser = await this.incrementTokenVersion(user);
        const newAccessToken = this.tokenService.createAccessToken(updatedUser);

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
      },
      'Refresh token failed',
      true,
    );
  }
}
