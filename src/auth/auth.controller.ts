import {
  Controller,
  Post,
  Body,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
  Res,
  Query,
  Get,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthDto, EmailBase, PasswordBase } from './auth.dto';
import { Request, Response } from 'express';
import { CookieService } from '../common/cookie.service';
import { JwtUser, ResponseStatusDto } from 'src/common/common.dto';
import { RequestHandlerService } from 'src/common/request-handler.service';
import { TokenService } from 'src/common/token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly requestHandlerService: RequestHandlerService,
  ) {}

  @Post('signup')
  async signup(
    @Body() body: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const { email, password, rememberMe } = body;
      const { accessToken, refreshToken } = await this.authService.signup({
        email,
        password,
      });
      this.setAuthCookies(res, accessToken, refreshToken, rememberMe);
      return {
        success: true,
        message: 'Registration successful. Please verify your email.',
      };
    }, 'Sign up error');
  }

  @Get('verification')
  async verification(
    @Query('verificationToken') verificationToken: string,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      await this.authService.verifyEmail(verificationToken);
      return { success: true, message: 'Email verified successfully' };
    }, 'Eror during email verification');
  }

  @Post('login')
  async login(
    @Body() body: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const { email, password, rememberMe } = body;
      const { accessToken, refreshToken } = await this.authService.login({
        email,
        password,
      });
      this.setAuthCookies(res, accessToken, refreshToken, rememberMe);
      return { success: true, message: 'Login successful' };
    }, 'Login error');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @Req()
    req: { user: JwtUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      await this.authService.logout(req.user.userId);
      this.clearAuthCookies(res);
      return { success: true, message: 'Logout successful' };
    }, 'Log out error');
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete')
  async deleteUser(
    @Req()
    req: { user: JwtUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      await this.authService.deleteUser(req.user.userId);
      this.clearAuthCookies(res);
      return {
        success: true,
        message: `User deleted successfully`,
      };
    }, 'Delete account error');
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() { email }: EmailBase,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      await this.authService.sendPasswordResetEmail(email);
      return {
        success: true,
        message: 'Password reset email sent successfully',
      };
    }, 'Error while sending reset password email');
  }

  @Patch('reset-password')
  async resetPassword(
    @Query('resetToken') resetToken: string,
    @Body() { password }: PasswordBase,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      await this.authService.resetPassword({ resetToken, password });
      return { success: true, message: 'Password updated successfully' };
    }, 'Reset password error');
  }

  @Get('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('rememberMe') rememberMe?: string,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const { access_token: accessToken, refresh_token: refreshToken } =
        req.cookies;

      if (!accessToken || !refreshToken)
        throw new UnauthorizedException('Missing access or refresh token');

      const userId = this.tokenService.extractUserIdFromToken(accessToken);
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await this.authService.refreshToken(userId, refreshToken);

      this.setAuthCookies(
        res,
        newAccessToken,
        newRefreshToken,
        rememberMe === 'true',
      );
      return { success: true, message: 'Tokens updated successfully' };
    }, 'Refresh token error');
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean = false,
  ) {
    this.cookieService.setAccessTokenCookie(res, accessToken, rememberMe);
    this.cookieService.setRefreshTokenCookie(res, refreshToken, rememberMe);
  }

  private clearAuthCookies(res: Response) {
    this.cookieService.clearAccessTokenCookie(res);
    this.cookieService.clearRefreshTokenCookie(res);
  }
}
