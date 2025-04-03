import { Controller, Get, Res } from '@nestjs/common';
import { CookiesService } from './cookies.service';
import { handleRequest } from 'src/common/utils/request-handler.util';
import { IResponseStatus } from 'src/common/common.types';
import { Response } from 'express';

@Controller('cookies')
export class CookiesController {
  constructor(private readonly cookiesService: CookiesService) {}

  @Get('clear-auth-cookies')
  async clearCookies(
    @Res({ passthrough: true }) res: Response,
  ): Promise<IResponseStatus> {
    return handleRequest(async () => {
      this.cookiesService.clearAuthCookies(res);
      return { success: true, message: 'Cookies deleted successfully' };
    }, 'Coolies deleted error');
  }
}
