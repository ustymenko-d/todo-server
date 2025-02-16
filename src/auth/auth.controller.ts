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

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
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

      this.setRefreshTokenCookie(res, refreshToken);

      return {
        accessToken,
        message:
          'Registration successful. Please verify your email. If you do not verify your email, your account will be deleted in a week',
      };
    } catch {
      throw new UnauthorizedException('Registration failed.');
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

      return { message: 'Email verified successfully' };
    } catch {
      throw new UnauthorizedException('Email verification failed.');
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

      this.setRefreshTokenCookie(res, refreshToken);

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Log in failed.');
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

      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return { message: 'Logout successful .' };
    } catch {
      throw new UnauthorizedException('Log out failed.');
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
    } catch {
      throw new UnauthorizedException('User deletion failed.');
    }
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email: string,
  ): Promise<ResponseStatusDto> {
    try {
      await this.authService.sendResetPasswordEmail(email);
      return { message: 'Reset password email sent' };
    } catch {
      throw new UnauthorizedException('Reset password email sent failed.');
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
    } catch {
      throw new UnauthorizedException('Password update failed.');
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

      this.setRefreshTokenCookie(res, newRefreshToken);

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
