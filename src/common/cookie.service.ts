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

  private readonly THREE_HOURS_IN_MS = 3 * 60 * 60 * 1000;
  private readonly SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

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
    this.setCookie(res, 'access_token', accessToken, this.THREE_HOURS_IN_MS);
  }

  clearAccessTokenCookie(res: Response) {
    this.clearCookie(res, 'access_token');
  }

  setRefreshTokenCookie(res: Response, refreshToken: string) {
    this.setCookie(res, 'refresh_token', refreshToken, this.SEVEN_DAYS_IN_MS);
  }

  clearRefreshTokenCookie(res: Response) {
    this.clearCookie(res, 'refresh_token');
  }
}
