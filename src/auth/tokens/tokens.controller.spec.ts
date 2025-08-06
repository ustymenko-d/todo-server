import { Test, TestingModule } from '@nestjs/testing';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { CookiesService } from '../cookies/cookies.service';
import { UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { mockTokensService, TTokensServiceMock } from 'test/mocks/tokens.mock';
import {
  mockCookiesService,
  TCookiesServiceMock,
} from 'test/mocks/cookies.mock';
import { expectThrows } from 'test/utils/expectThrows';
import { mockLoggerError } from 'test/mocks/commons.mock';

describe('TokensController', () => {
  let controller: TokensController;
  let tokenService: TTokensServiceMock;
  let cookiesService: TCookiesServiceMock;
  let loggerErrorSpy: jest.SpyInstance;

  const response = {} as Response;
  const oldCookies = {
    accessToken: 'old-access-token',
    refreshToken: 'old-refresh-token',
    rememberMe: 'true',
  };
  const decoded = { userId: 'user-id', sessionId: 'session-1' };

  const makeRequest = (cookies: Partial<Record<string, string>>): Request =>
    ({ cookies }) as Request;

  const setupMocks = (opts?: {
    decode?: typeof decoded;
    refresh?: { accessToken: string; refreshToken: string };
    refreshError?: Error;
  }) => {
    if (opts?.decode) {
      (tokenService.decodeAccessToken as jest.Mock).mockReturnValue(
        opts.decode,
      );
    }
    if (opts?.refresh) {
      (tokenService.refreshTokens as jest.Mock).mockResolvedValue(opts.refresh);
    }
    if (opts?.refreshError) {
      (tokenService.refreshTokens as jest.Mock).mockRejectedValue(
        opts.refreshError,
      );
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokensController],
      providers: [
        { provide: TokensService, useFactory: mockTokensService },
        { provide: CookiesService, useFactory: mockCookiesService },
      ],
    }).compile();

    controller = module.get(TokensController);
    tokenService = module.get(TokensService);
    cookiesService = module.get(CookiesService);
    loggerErrorSpy = mockLoggerError(controller);
  });

  describe('refreshTokens', () => {
    it('throws UnauthorizedException when refreshToken is missing', async () => {
      const request = makeRequest({
        accessToken: 'access-token',
      });
      await expect(controller.refreshTokens(request, response)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('decodes, refreshes, sets cookies, and returns success', async () => {
      const request = makeRequest(oldCookies);
      const refreshed = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      setupMocks({ decode: decoded, refresh: refreshed });

      const result = await controller.refreshTokens(request, response);

      expect(tokenService.decodeAccessToken).toHaveBeenCalledWith(
        oldCookies.accessToken,
      );
      expect(tokenService.refreshTokens).toHaveBeenCalledWith(
        decoded.userId,
        oldCookies.refreshToken,
        decoded.sessionId,
      );
      expect(cookiesService.setAuthCookies).toHaveBeenCalledWith(
        response,
        refreshed.accessToken,
        refreshed.refreshToken,
        true,
      );
      expect(result).toEqual({
        success: true,
        message: 'Tokens updated successfully.',
      });
    });

    it('log and rethrow on refreshTokens error', async () => {
      const request = makeRequest(oldCookies);

      setupMocks({ decode: decoded, refreshError: new Error('Error') });

      await expectThrows(() => controller.refreshTokens(request, response));

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Refresh tokens error.',
        expect.anything(),
      );
    });
  });
});
