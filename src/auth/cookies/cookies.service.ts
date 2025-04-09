import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Injectable()
export class CookiesService {
  private readonly COOKIE_OPTIONS: Record<string, any>;

  constructor(private readonly configService: ConfigService) {
    this.COOKIE_OPTIONS = {
      httpOnly: true,
      partitioned: this.configService.get<string>('NODE_ENV') === 'production',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite:
        this.configService.get<string>('NODE_ENV') === 'production'
          ? ('none' as const)
          : ('lax' as const),
    };
  }

  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean = false,
  ) {
    this.setCookie(
      res,
      'access_token',
      accessToken,
      rememberMe ? CookiesService.EXPIRATION_TIMES : undefined,
    );
    this.setCookie(
      res,
      'refresh_token',
      refreshToken,
      rememberMe ? CookiesService.EXPIRATION_TIMES : undefined,
    );
  }

  clearAuthCookies(res: Response) {
    this.clearCookie(res, 'access_token');
    this.clearCookie(res, 'refresh_token');
  }

  private setCookie(
    res: Response,
    name: string,
    value: string,
    maxAge?: number,
  ) {
    const options = maxAge
      ? { ...this.COOKIE_OPTIONS, maxAge }
      : this.COOKIE_OPTIONS;
    res.cookie(name, value, options);
  }

  private clearCookie(res: Response, name: string) {
    res.clearCookie(name, this.COOKIE_OPTIONS);
  }

  private static readonly EXPIRATION_TIMES = 12 * 60 * 60 * 1000;
}
