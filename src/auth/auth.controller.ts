import {
  Controller,
  Post,
  Body,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
  Res,
  Logger,
  Query,
  Get,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import {
  AccessTokenDto,
  AuthBaseDto,
  JwtUserDto,
  PasswordBaseDto,
  ResponseStatusDto,
  SignUpDto,
} from './auth.dto';
import { Request, Response } from 'express';
import { CookieService } from '../common/cookie.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private cookieService: CookieService,
  ) {}

  private readonly logger = new Logger(AuthController.name);

  private handleError(message: string, error: Error): never {
    this.logger.error(message, error.stack);
    throw error;
  }

  @Post('signup')
  async signup(
    @Body() body: AuthBaseDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignUpDto> {
    try {
      const { email, password } = body;
      const { accessToken, refreshToken } = await this.authService.signup(
        email,
        password,
      );

      this.cookieService.setRefreshTokenCookie(res, refreshToken);

      return {
        accessToken,
        message:
          'Registration successful. Please verify your email. If you do not verify your email, your account will be deleted in a week.',
      };
    } catch (error) {
      this.handleError('Eror while signing up:', error);
    }
  }

  @Get('verification')
  async verification(
    @Query('token') token: string,
  ): Promise<ResponseStatusDto> {
    try {
      const user = await this.authService.verifyEmail(token);

      if (!user)
        throw new UnauthorizedException(
          'Invalid or expired verification token',
        );

      return { message: 'Email verified successfully.' };
    } catch (error) {
      this.handleError('Eror during email verification:', error);
    }
  }

  @Post('login')
  async login(
    @Body() body: AuthBaseDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenDto> {
    try {
      const { email, password } = body;
      const { accessToken, refreshToken } = await this.authService.login(
        email,
        password,
      );

      this.cookieService.setRefreshTokenCookie(res, refreshToken);

      return { accessToken };
    } catch (error) {
      this.handleError('Error while logging in:', error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @Req() req: { user: JwtUserDto },
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResponseStatusDto> {
    try {
      const { userId } = req.user;
      await this.authService.logout(userId);
      this.cookieService.clearRefreshTokenCookie(res);
      return { message: 'Logout successful.' };
    } catch (error) {
      this.handleError('Error while logging out:', error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete')
  async deleteUser(
    @Req() req: { user: JwtUserDto },
  ): Promise<ResponseStatusDto> {
    try {
      const { userId } = req.user;
      await this.authService.deleteUser(userId);
      return { message: `User (${userId}) deleted successfully.` };
    } catch (error) {
      this.handleError('Eror while deleteing:', error);
    }
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email: string,
  ): Promise<ResponseStatusDto> {
    try {
      await this.authService.sendResetPasswordEmail(email);
      return { message: 'Reset password email sent' };
    } catch (error) {
      this.handleError('Error while sending reset password email:', error);
    }
  }

  @Patch('reset-password')
  async resetPassword(
    @Query('token') token: string,
    @Body() passwordDto: PasswordBaseDto,
  ): Promise<ResponseStatusDto> {
    try {
      await this.authService.resetPassword(token, passwordDto);
      return { message: 'Password updated successfully' };
    } catch (error) {
      this.handleError('Error while resetting password:', error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('refresh')
  async refresh(
    @Req() req: Request & { user: JwtUserDto },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenDto> {
    try {
      const { userId } = req.user;
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken)
        throw new UnauthorizedException('No refresh token found');

      const { accessToken, refreshToken: newRefreshToken } =
        await this.authService.refreshToken(userId, refreshToken);

      this.cookieService.setRefreshTokenCookie(res, newRefreshToken);

      return { accessToken };
    } catch (error) {
      this.handleError('Error while resetting password:', error);
    }
  }
}
