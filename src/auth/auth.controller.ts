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
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthData } from './auth.dto';
import { CookiesService } from './cookies/cookies.service';
import { IJwtUser, IResponseStatus } from 'src/common/common.types';
import { IAuthResponse, IUserInfo } from './auth.types';
import { handleRequest } from 'src/common/utils/requestHandler';
import { RecaptchaGuard } from 'src/common/recaptcha.guard';
import { StripRecaptchaInterceptor } from 'src/common/strip-recaptcha.interceptor';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly cookiesService: CookiesService,
  ) {}

  @Post('signup')
  @UseGuards(RecaptchaGuard)
  @UseInterceptors(StripRecaptchaInterceptor)
  async signup(
    @Body() body: AuthData,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IAuthResponse> {
    return handleRequest(
      async () => {
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
      },
      'Registration error.',
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
        return { success: true, message: 'Email verified successfully.' };
      },
      'Error during email verification.',
      this.logger,
    );
  }

  @Post('login')
  @UseGuards(RecaptchaGuard)
  @UseInterceptors(StripRecaptchaInterceptor)
  async login(
    @Body() body: AuthData,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IAuthResponse> {
    return handleRequest(
      async () => {
        const { email, password, rememberMe } = body;
        const { accessToken, refreshToken, userInfo } =
          await this.authService.login(email, password);

        this.cookiesService.setAuthCookies(
          res,
          accessToken,
          refreshToken,
          rememberMe,
        );

        return { success: true, message: 'Login successful.', userInfo };
      },
      'Login error.',
      this.logger,
    );
  }

  @Get('account-info')
  @UseGuards(AuthGuard('jwt'))
  async getAccountInfo(@Req() req: { user: IJwtUser }): Promise<IUserInfo> {
    return handleRequest(
      async () => await this.authService.getAccountInfo(req.user.userId),
      'Get account info error.',
      this.logger,
    );
  }

  @Get('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(
    @Req() req: Request & { user: IJwtUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        const { userId, sessionId } = req.user;
        await this.authService.logout(userId, sessionId);
        this.cookiesService.clearAuthCookies(res);
        return { success: true, message: 'Logout successful.' };
      },
      'Logout error.',
      this.logger,
    );
  }

  @Delete('delete-account')
  @UseGuards(RecaptchaGuard, AuthGuard('jwt'))
  @UseInterceptors(StripRecaptchaInterceptor)
  async deleteAccount(
    @Req() req: { user: IJwtUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        await this.authService.deleteUser(req.user.userId);
        this.cookiesService.clearAuthCookies(res);
        return {
          success: true,
          message: `User deleted successfully.`,
        };
      },
      'Delete account error.',
      this.logger,
    );
  }
}
