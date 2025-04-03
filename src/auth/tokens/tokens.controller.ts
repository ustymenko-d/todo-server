import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { IResponseStatus } from 'src/common/common.types';
import { TokensService } from './tokens.service';
import { AuthService } from '../auth.service';
import { CookiesService } from '../cookies/cookies.service';
import { RequestHandlerService } from 'src/common/services/request-handler.service';
import { Request, Response } from 'express';

@Controller('tokens')
export class TokensController {
  constructor(
    private readonly tokenService: TokensService,
    private readonly authService: AuthService,
    private readonly cookiesService: CookiesService,
    private readonly requestHandlerService: RequestHandlerService,
  ) {}

  @Get('refresh-tokens')
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('rememberMe') rememberMe?: string,
  ): Promise<IResponseStatus> {
    return this.requestHandlerService.handleRequest(async () => {
      const { access_token: accessToken, refresh_token: refreshToken } =
        req.cookies;

      if (!accessToken || !refreshToken)
        throw new UnauthorizedException('Missing access or refresh token');

      const userId = this.tokenService.extractUserIdFromToken(accessToken);
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await this.authService.refreshTokens(userId, refreshToken);

      this.cookiesService.setAuthCookies(
        res,
        newAccessToken,
        newRefreshToken,
        rememberMe === 'true',
      );
      return { success: true, message: 'Tokens updated successfully' };
    }, 'Refresh token error');
  }
}
