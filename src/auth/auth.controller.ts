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
import {
  AccessTokenDto,
  AuthBaseDto,
  EmailBaseDto,
  JwtUserDto,
  PasswordBaseDto,
  SignUpDto,
} from './auth.dto';
import { Request, Response } from 'express';
import { CookieService } from '../common/cookie.service';
import { ResponseStatusDto } from 'src/common/common.dto';
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
    @Body() body: AuthBaseDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignUpDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const { email, password } = body;
      const { accessToken, refreshToken } = await this.authService.signup({
        email,
        password,
      });

      this.cookieService.setRefreshTokenCookie(res, refreshToken);
      return {
        accessToken,
        message:
          'Registration successful. Please verify your email. If you do not verify your email, your account will be deleted in a week.',
      };
    }, 'Sign up error');
  }

  @Get('verification')
  async verification(
    @Query('token') token: string,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const user = await this.authService.verifyEmail(token);
      if (!user)
        throw new UnauthorizedException(
          'Invalid or expired verification token',
        );
      return { success: true, message: 'Email verified successfully.' };
    }, 'Eror during email verification');
  }

  @Post('login')
  async login(
    @Body() body: AuthBaseDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const { accessToken, refreshToken } = await this.authService.login(
        body.email,
        body.password,
      );
      this.cookieService.setAccessTokenCookie(res, accessToken);
      this.cookieService.setRefreshTokenCookie(res, refreshToken);
      return { accessToken };
    }, 'Log in error');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @Req() req: { user: JwtUserDto },
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const { userId } = req.user;
      await this.authService.logout({ userId });
      this.cookieService.clearRefreshTokenCookie(res);
      return { success: true, message: 'Logout successful.' };
    }, 'Log out error');
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete')
  async deleteUser(
    @Req() req: { user: JwtUserDto },
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const { userId } = req.user;
      await this.authService.deleteUser(userId);
      return {
        success: true,
        message: `User (${userId}) deleted successfully.`,
      };
    }, 'Delete account error');
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() { email }: EmailBaseDto,
  ): Promise<ResponseStatusDto> {
    return this.requestHandlerService.handleRequest(async () => {
      await this.authService.sendPasswordResetEmail({ email });
      return { success: true, message: 'Reset password email sent' };
    }, 'Error while sending reset password email');
  }

  @Patch('reset-password')
  async resetPassword(
    @Query('token') resetToken: string,
    @Body() { password }: PasswordBaseDto,
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
  ): Promise<AccessTokenDto> {
    return this.requestHandlerService.handleRequest(async () => {
      const { access_token: accessToken, refresh_token: refreshToken } =
        req.cookies;

      if (!accessToken || !refreshToken) {
        throw new UnauthorizedException(
          `Missing ${!accessToken ? 'access' : 'refresh'} token`,
        );
      }

      let userId: string;

      try {
        const decodedToken = this.tokenService.decodeAccessToken(accessToken);
        userId = decodedToken?.sub;
        if (!userId) throw new UnauthorizedException('Missing user id ');
      } catch {
        throw new UnauthorizedException('Invalid or expired access token');
      }

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await this.authService.refreshToken({ userId, refreshToken });

      this.cookieService.setRefreshTokenCookie(res, newRefreshToken);
      this.cookieService.setAccessTokenCookie(res, newAccessToken);
      return { accessToken: newAccessToken };
    }, 'Refresh token error');
  }
}
