import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TokensService } from './tokens.service';
import { CookiesService } from '../cookies/cookies.service';
import { handleRequest } from 'src/common/utils/request-handler.util';
import { IResponseStatus } from 'src/common/common.types';

@Controller('auth/tokens')
export class TokensController {
  constructor(
    private readonly tokenService: TokensService,
    private readonly cookiesService: CookiesService,
  ) {}

  @Get('refresh-tokens')
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('rememberMe') rememberMe?: string,
  ): Promise<IResponseStatus> {
    return handleRequest(async () => {
      const { access_token: accessToken, refresh_token: refreshToken } =
        req.cookies;

      if (!accessToken || !refreshToken)
        throw new UnauthorizedException('Missing access or refresh token');

      const userId = this.tokenService.extractUserIdFromToken(accessToken);
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await this.tokenService.refreshTokens(userId, refreshToken);

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
