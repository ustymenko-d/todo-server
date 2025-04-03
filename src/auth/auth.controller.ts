import {
  Controller,
  Post,
  Body,
  Delete,
  UseGuards,
  Req,
  Res,
  Query,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthDto } from './auth.dto';
import { Response } from 'express';
import { CookiesService } from './cookies/cookies.service';
import { IJwtUser, IResponseStatus } from 'src/common/common.types';
import { IAuthResponse, IUserInfo } from './auth.types';
import { handleRequest } from 'src/common/utils/request-handler.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookiesService: CookiesService,
  ) {}

  @Post('signup')
  async signup(
    @Body() body: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IAuthResponse> {
    return handleRequest(async () => {
      const { email, password, rememberMe } = body;
      const { accessToken, refreshToken, userInfo } =
        await this.authService.signup(email, password);
      this.cookiesService.setAuthCookies(
        res,
        accessToken,
        refreshToken,
        rememberMe,
      );
      return {
        success: true,
        message: 'Registration successful. Please verify your email.',
        userInfo,
      };
    }, 'Signup error');
  }

  @Get('email-verification')
  async emailVerification(
    @Query('verificationToken') verificationToken: string,
  ): Promise<IResponseStatus> {
    return handleRequest(async () => {
      await this.authService.verifyEmail(verificationToken);
      return { success: true, message: 'Email verified successfully' };
    }, 'Error during email verification');
  }

  @Post('login')
  async login(
    @Body() body: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IAuthResponse> {
    return handleRequest(async () => {
      const { email, password, rememberMe } = body;
      const { accessToken, refreshToken, userInfo } =
        await this.authService.login(email, password);
      this.cookiesService.setAuthCookies(
        res,
        accessToken,
        refreshToken,
        rememberMe,
      );
      return { success: true, message: 'Login successful', userInfo };
    }, 'Login error');
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('check')
  async checkAuth(@Req() req: { user: IJwtUser }): Promise<IUserInfo> {
    return handleRequest(async () => {
      return await this.authService.getAccountInfo(req.user.userId);
    }, 'Get user info error');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @Res({ passthrough: true }) res: Response,
  ): Promise<IResponseStatus> {
    return handleRequest(async () => {
      this.cookiesService.clearAuthCookies(res);
      return { success: true, message: 'Logout successful' };
    }, 'Logout error');
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete-account')
  async deleteAccount(
    @Req()
    req: { user: IJwtUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<IResponseStatus> {
    return handleRequest(async () => {
      await this.authService.deleteUser(req.user.userId);
      this.cookiesService.clearAuthCookies(res);
      return {
        success: true,
        message: `User deleted successfully`,
      };
    }, 'Delete account error');
  }
}
