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
import { MailService } from 'src/auth/mail/mail.service';
import { PasswordService } from 'src/auth/password/password.service';
import { TokensService } from 'src/auth/tokens/tokens.service';
import { ClientMeta } from 'src/common/utils/getClientMeta';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokensService,
    private readonly mailService: MailService,
    private readonly passwordService: PasswordService,
  ) {}

  async signup(
    email: string,
    password: string,
    meta: ClientMeta,
  ): Promise<IAuthData> {
    const verificationToken = uuidv4();
    const hashedPassword = await this.passwordService.hashPassword(password);
    const user = await this.createUser(
      email,
      hashedPassword,
      verificationToken,
    );
    await this.mailService.sendVerificationEmail(email, verificationToken);
    return {
      accessToken: this.tokenService.createAccessToken(user),
      refreshToken: await this.tokenService.createRefreshToken(user.id, meta),
      userInfo: this.createUserInfo(user),
    };
  }

  async verifyEmail(verificationToken: string): Promise<void> {
    const { id } = await this.findUserBy({ verificationToken });
    await this.prisma.user.update({
      where: { id },
      data: { isVerified: true, verificationToken: null },
    });
  }

  async login(
    email: string,
    password: string,
    meta: ClientMeta,
  ): Promise<IAuthData> {
    const user = await this.findUserBy({ email });
    const passwordVerified = await this.passwordService.comparePasswords(
      password,
      user.password,
    );

    if (!passwordVerified)
      throw new UnauthorizedException('Invalid credentials');

    await this.tokenService.revokePreviousTokens(user.id, meta);

    return {
      accessToken: this.tokenService.createAccessToken(user),
      refreshToken: await this.tokenService.createRefreshToken(user.id, meta),
      userInfo: this.createUserInfo(user),
    };
  }

  async logout(id: string, meta: ClientMeta): Promise<void> {
    await this.tokenService.revokePreviousTokens(id, meta);
  }

  async getAccountInfo(id: string): Promise<IUserInfo> {
    const user = await this.findUserBy({ id });
    return this.createUserInfo(user);
  }

  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
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

  async findUserBy(query: TFindUserByQuery): Promise<IUser> {
    const user = await this.prisma.user.findUnique({ where: query });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private createUserInfo({
    id,
    email,
    username,
    createdAt,
    isVerified,
  }: IUser): IUserInfo {
    return { id, email, username, createdAt, isVerified };
  }
}
