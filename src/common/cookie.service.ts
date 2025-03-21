import { Injectable } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class CookieService {
  private readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite:
      process.env.NODE_ENV === 'production'
        ? ('none' as const)
        : ('lax' as const),
    path: '/',
  };

  private readonly EXPIRATION_TIMES = {
    accessToken: 3 * 60 * 60 * 1000, // 3 hours
    refreshToken: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

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

  setAccessTokenCookie(
    res: Response,
    accessToken: string,
    rememberMe: boolean,
  ) {
    this.setCookie(
      res,
      'access_token',
      accessToken,
      rememberMe ? this.EXPIRATION_TIMES.accessToken : undefined,
    );
  }

  clearAccessTokenCookie(res: Response) {
    this.clearCookie(res, 'access_token');
  }

  setRefreshTokenCookie(
    res: Response,
    refreshToken: string,
    rememberMe: boolean,
  ) {
    this.setCookie(
      res,
      'refresh_token',
      refreshToken,
      rememberMe ? this.EXPIRATION_TIMES.refreshToken : undefined,
    );
  }

  clearRefreshTokenCookie(res: Response) {
    this.clearCookie(res, 'refresh_token');
  }
}
