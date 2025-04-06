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
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthDto } from './auth.dto';
import { CookiesService } from './cookies/cookies.service';
import { IJwtUser, IResponseStatus } from 'src/common/common.types';
import { IAuthResponse, IUserInfo } from './auth.types';
import { handleRequest } from 'src/common/utils/requestHandler';
import { getClientMeta } from 'src/common/utils/getClientMeta';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookiesService: CookiesService,
  ) {}

  @Post('signup')
  async signup(
    @Req() req: Request,
    @Body() body: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IAuthResponse> {
    return handleRequest(
      async () => {
        const meta = getClientMeta(req);
        const { email, password, rememberMe } = body;
        const { accessToken, refreshToken, userInfo } =
          await this.authService.signup(email, password, meta);
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
      },
      'Signup error',
      this.logger,
    );
  }

  @Get('email-verification')
  async emailVerification(
    @Query('verificationToken') verificationToken: string,
  ): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        await this.authService.verifyEmail(verificationToken);
        return { success: true, message: 'Email verified successfully' };
      },
      'Error during email verification',
      this.logger,
    );
  }

  @Post('login')
  async login(
    @Req() req: Request,
    @Body() body: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IAuthResponse> {
    return handleRequest(
      async () => {
        const meta = getClientMeta(req);
        const { email, password, rememberMe } = body;
        const { accessToken, refreshToken, userInfo } =
          await this.authService.login(email, password, meta);
        this.cookiesService.setAuthCookies(
          res,
          accessToken,
          refreshToken,
          rememberMe,
        );
        return { success: true, message: 'Login successful', userInfo };
      },
      'Login error',
      this.logger,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('check')
  async checkAuth(@Req() req: { user: IJwtUser }): Promise<IUserInfo> {
    return handleRequest(
      async () => {
        return await this.authService.getAccountInfo(req.user.userId);
      },
      'Get user info error',
      this.logger,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @Req() req: Request & { user: IJwtUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        const { userId } = req.user;
        const meta = getClientMeta(req);
        await this.authService.logout(userId, meta);
        this.cookiesService.clearAuthCookies(res);
        return { success: true, message: 'Logout successful' };
      },
      'Logout error',
      this.logger,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete-account')
  async deleteAccount(
    @Req()
    req: { user: IJwtUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        await this.authService.deleteUser(req.user.userId);
        this.cookiesService.clearAuthCookies(res);
        return {
          success: true,
          message: `User deleted successfully`,
        };
      },
      'Delete account error',
      this.logger,
    );
  }

  private readonly logger = new Logger(AuthController.name);
}
