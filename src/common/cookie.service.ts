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
    maxAge: number,
  ) {
    res.cookie(name, value, {
      ...this.COOKIE_OPTIONS,
      maxAge,
    });
  }

  private clearCookie(res: Response, name: string) {
    res.clearCookie(name, this.COOKIE_OPTIONS);
  }

  setAccessTokenCookie(res: Response, accessToken: string) {
    this.setCookie(
      res,
      'access_token',
      accessToken,
      this.EXPIRATION_TIMES.accessToken,
    );
  }

  clearAccessTokenCookie(res: Response) {
    this.clearCookie(res, 'access_token');
  }

  setRefreshTokenCookie(res: Response, refreshToken: string) {
    this.setCookie(
      res,
      'refresh_token',
      refreshToken,
      this.EXPIRATION_TIMES.refreshToken,
    );
  }

  clearRefreshTokenCookie(res: Response) {
    this.clearCookie(res, 'refresh_token');
  }
}
