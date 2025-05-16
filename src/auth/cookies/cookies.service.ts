import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Injectable()
export class CookiesService {
  private readonly COOKIE_OPTIONS: Record<string, any>;
  private static readonly EXPIRATION_TIMES = 12 * 60 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    this.COOKIE_OPTIONS = {
      httpOnly: true,
      partitioned: isProduction,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
    };
  }

  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    rememberMe = false,
  ) {
    const expiration = rememberMe ? CookiesService.EXPIRATION_TIMES : undefined;
    this.setCookie(res, 'accessToken', accessToken, expiration);
    this.setCookie(res, 'refreshToken', refreshToken, expiration);
    this.setCookie(res, 'rememberMe', rememberMe.toString(), expiration);
  }

  clearAuthCookies(res: Response) {
    ['accessToken', 'refreshToken', 'rememberMe'].forEach((name) =>
      this.clearCookie(res, name),
    );
  }

  private setCookie(
    res: Response,
    name: string,
    value: string,
    maxAge: number,
  ) {
    const options = maxAge
      ? { ...this.COOKIE_OPTIONS, maxAge }
      : this.COOKIE_OPTIONS;
    res.cookie(name, value, options);
  }

  private clearCookie(res: Response, name: string) {
    res.clearCookie(name, this.COOKIE_OPTIONS);
  }
}
