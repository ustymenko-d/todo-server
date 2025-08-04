import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { IAuthData, IUser, IUserInfo, TFindUserByQuery } from './auth.types';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { TokensService } from 'src/auth/tokens/tokens.service';
import { MailService } from 'src/auth/mail/mail.service';
import HashHandler from 'src/common/utils/HashHandler';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokensService,
    private readonly mailService: MailService,
  ) {}

  async signup(email: string, password: string): Promise<IAuthData> {
    const sessionId = uuidv4();
    const verificationToken = uuidv4();
    const hashedPassword = await HashHandler.hashString(password);
    const user = await this.createUser(
      email,
      hashedPassword,
      verificationToken,
    );

    await this.mailService.sendVerificationEmail(email, verificationToken);

    return {
      accessToken: this.tokenService.createAccessToken(user, sessionId),
      refreshToken: await this.tokenService.createRefreshToken(
        user.id,
        sessionId,
      ),
      userInfo: await this.createUserInfo(user),
    };
  }

  async verifyEmail(verificationToken: string) {
    try {
      await this.prisma.user.update({
        where: { verificationToken },
        data: { isVerified: true, verificationToken: null },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Verification token is invalid or expired.',
        );
      }
      throw error;
    }
  }

  async resendVerificationEmail(email: string) {
    const { verificationToken, isVerified } = await this.prisma.user.findUnique(
      {
        where: { email },
        select: { verificationToken: true, isVerified: true },
      },
    );

    if (isVerified)
      throw new ConflictException(
        'User is already verified. No need to resend verification email.',
      );

    if (!verificationToken)
      throw new NotFoundException('Verification token not found.');

    await this.mailService.sendVerificationEmail(email, verificationToken);
  }

  async login(email: string, password: string): Promise<IAuthData> {
    const user = await this.findUserBy({ email });
    const passwordVerified = await HashHandler.compareString(
      password,
      user.password,
    );

    if (!passwordVerified)
      throw new UnauthorizedException('Invalid credentials.');

    const sessionId = uuidv4();

    return {
      accessToken: this.tokenService.createAccessToken(user, sessionId),
      refreshToken: await this.tokenService.createRefreshToken(
        user.id,
        sessionId,
      ),
      userInfo: await this.createUserInfo(user),
    };
  }

  async logout(id: string, sessionId: string) {
    await this.tokenService.revokePreviousTokens(id, sessionId);
  }

  async getAccountInfo(id: string): Promise<IUserInfo> {
    const user = await this.findUserBy({ id });
    return await this.createUserInfo(user);
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }

  // --- Helper methods ---

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
        throw new ConflictException('User with this email already exists.');
      }
      throw new InternalServerErrorException('Failed to create user.');
    }
  }

  async findUserBy(query: TFindUserByQuery): Promise<IUser> {
    const user = await this.prisma.user.findUnique({ where: query });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private async createUserInfo({
    id,
    email,
    username,
    createdAt,
    isVerified,
  }: IUser): Promise<IUserInfo> {
    return {
      id,
      email,
      username,
      createdAt,
      isVerified,
    };
  }
}
