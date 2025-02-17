import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { PasswordBaseDto, TokenPairDto, UserDto } from './auth.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MailService } from 'src/common/mail.service';
import { PasswordService } from 'src/common/password.service';
import { TokenService } from 'src/common/token.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private tokenService: TokenService,
    private mailService: MailService,
    private passwordService: PasswordService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  private async createUser(
    email: string,
    hashedPassword: string,
    hashedVerificationToken: string,
  ) {
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

  async signup(email: string, password: string): Promise<TokenPairDto> {
    try {
      const verificationToken = uuidv4();
      const hashedPassword = await this.passwordService.hashPassword(password);
      const user = await this.createUser(
        email,
        hashedPassword,
        verificationToken,
      );
      const refreshToken = await this.tokenService.createRefreshToken(user.id);
      const accessToken = this.tokenService.createToken(user);

      await this.mailService.sendVerificationEmail(email, verificationToken);

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
        !(await this.passwordService.comparePasswords(password, user.password))
      )
        throw new UnauthorizedException('Invalid credentials');

      const updatedUser = await this.incrementTokenVersion(user);

      await this.tokenService.revokePreviousTokens(user.id);

      const refreshToken = await this.tokenService.createRefreshToken(user.id);
      const accessToken = this.tokenService.createToken(updatedUser);

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async logout(userId: string) {
    try {
      await this.tokenService.revokePreviousTokens(userId);

      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) throw new UnauthorizedException('User not found');

      await this.incrementTokenVersion(user);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) throw new UnauthorizedException('User not found');

      await this.prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
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

      this.mailService.sendResetPasswordEmail(email, resetToken);

      this.logger.log(`Reset password email sent to ${email}`);
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
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

      const hashedPassword = await this.passwordService.hashPassword(
        newPasswordDto.password,
      );

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, tokenVersion: { increment: 1 } },
      });
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }

  async refreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<TokenPairDto> {
    try {
      await this.tokenService.validateRefreshToken(userId, refreshToken);
      await this.tokenService.revokePreviousTokens(userId);

      const newRefreshToken =
        await this.tokenService.createRefreshToken(userId);
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
}
