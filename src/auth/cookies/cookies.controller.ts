import { Controller, Get, Logger, Res } from '@nestjs/common';
import { handleRequest } from 'src/common/utils/requestHandler';
import { IResponseStatus } from 'src/common/common.types';
import { CookiesService } from './cookies.service';
import { Response } from 'express';

@Controller('auth/cookies')
export class CookiesController {
  private readonly logger = new Logger(CookiesController.name);

  constructor(private readonly cookiesService: CookiesService) {}

  @Get('clear-auth-cookies')
  async clearAuthCookies(
    @Res({ passthrough: true }) res: Response,
  ): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        this.cookiesService.clearAuthCookies(res);
        return { success: true, message: 'Cookies cleared successfully.' };
      },
      'Cookie clear error.',
      this.logger,
    );
  }
}
