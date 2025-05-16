import {
  Controller,
  Get,
  Logger,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TokensService } from './tokens.service';
import { CookiesService } from '../cookies/cookies.service';
import { handleRequest } from 'src/common/utils/requestHandler';
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
  ): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        const { accessToken, refreshToken, rememberMe } = req.cookies;

        if (!accessToken || !refreshToken)
          throw new UnauthorizedException('Missing access or refresh token');

        const { userId, sessionId } =
          this.tokenService.decodeAccessToken(accessToken);
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          await this.tokenService.refreshTokens(
            userId,
            refreshToken,
            sessionId,
          );

        this.cookiesService.setAuthCookies(
          res,
          newAccessToken,
          newRefreshToken,
          rememberMe === 'true',
        );
        return { success: true, message: 'Tokens updated successfully' };
      },
      'Refresh token error',
      this.logger,
    );
  }

  private readonly logger = new Logger(TokensController.name);
}
