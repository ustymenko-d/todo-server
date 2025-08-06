import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CookiesService } from './cookies/cookies.service';
import {
  jwtUserMock,
  mockAuthService,
  TAuthServiceMock,
} from 'test/mocks/auth.mock';
import {
  mockCookiesService,
  TCookiesServiceMock,
} from 'test/mocks/cookies.mock';
import { AuthData } from './auth.dto';
import { IJwtUser } from 'src/common/common.types';
import { Request, Response } from 'express';
import { mockLoggerError } from 'test/mocks/commons.mock';
import { IUserInfo } from './auth.types';
import { expectThrows } from 'test/utils/expectThrows';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: TAuthServiceMock;
  let cookiesService: TCookiesServiceMock;
  let loggerErrorSpy: jest.SpyInstance;

  const makeRes = (): Response =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as unknown as Response;

  const makeReq = (user: IJwtUser): Request & { user: IJwtUser } =>
    ({ user }) as Request & { user: IJwtUser };

  const expectSuccess = (
    result: any,
    message: string,
    userInfo?: IUserInfo,
  ) => {
    expect(result).toEqual({
      success: true,
      message,
      ...(userInfo ? { userInfo } : {}),
    });
  };

  const expectErrorLogged = (message: string) => {
    expect(loggerErrorSpy).toHaveBeenCalledWith(message, expect.anything());
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useFactory: mockAuthService },
        { provide: CookiesService, useFactory: mockCookiesService },
      ],
    }).compile();

    controller = module.get(AuthController);
    authService = module.get(AuthService);
    cookiesService = module.get(CookiesService);
    loggerErrorSpy = mockLoggerError(controller);
  });

  describe('signup', () => {
    const dto: AuthData = {
      email: 'user@email.com',
      password: 'pass123',
      rememberMe: true,
    };
    const userInfo: IUserInfo = {
      id: 'user-id',
      email: dto.email,
      username: 'user',
      createdAt: new Date(),
      isVerified: false,
    };
    const tokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      userInfo,
    };

    it('registers, sets cookies, and returns success', async () => {
      authService.signup.mockResolvedValue(tokens);
      const res = makeRes();

      const result = await controller.signup(dto, res);

      expect(authService.signup).toHaveBeenCalledWith(dto.email, dto.password);
      expect(cookiesService.setAuthCookies).toHaveBeenCalledWith(
        res,
        tokens.accessToken,
        tokens.refreshToken,
        dto.rememberMe,
      );
      expectSuccess(
        result,
        'Registration successful. Please verify your email.',
        userInfo,
      );
    });

    it('logs and rethrows on error', async () => {
      authService.signup.mockRejectedValue(new Error('Error'));
      await expectThrows(() => controller.signup(dto, makeRes()));
      expectErrorLogged('Registration error.');
    });
  });

  describe('resendVerificationEmail', () => {
    const req = makeReq(jwtUserMock);

    it('resends email and returns success', async () => {
      authService.resendVerificationEmail.mockResolvedValue(undefined);
      const result = await controller.resendVerificationEmail(req);
      expect(authService.resendVerificationEmail).toHaveBeenCalledWith(
        req.user.email,
      );
      expectSuccess(result, 'Verification email sent successfully.');
    });

    it('logs and rethrows on error', async () => {
      authService.resendVerificationEmail.mockRejectedValue(new Error('Error'));
      await expectThrows(() => controller.resendVerificationEmail(req));
      expectErrorLogged('Error during resend verification email.');
    });
  });

  describe('emailVerification', () => {
    const token = 'verification-token';

    it('verifies and returns success', async () => {
      authService.verifyEmail.mockResolvedValue(undefined);
      const result = await controller.emailVerification(token);
      expect(authService.verifyEmail).toHaveBeenCalledWith(token);
      expectSuccess(result, 'Email verified successfully.');
    });

    it('logs and rethrows on error', async () => {
      authService.verifyEmail.mockRejectedValue(new Error('Error'));
      await expectThrows(() => controller.emailVerification(token));
      expectErrorLogged('Error during email verification.');
    });
  });

  describe('login', () => {
    const dto: AuthData = {
      email: 'user@email.com',
      password: 'pass123',
      rememberMe: false,
    };
    const userInfo: IUserInfo = {
      id: 'user-id',
      email: dto.email,
      username: 'user',
      createdAt: new Date(),
      isVerified: false,
    };
    const tokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      userInfo,
    };

    it('authenticates, sets cookies, and returns success', async () => {
      authService.login.mockResolvedValue(tokens);
      const res = makeRes();

      const result = await controller.login(dto, res);

      expect(authService.login).toHaveBeenCalledWith(dto.email, dto.password);
      expect(cookiesService.setAuthCookies).toHaveBeenCalledWith(
        res,
        tokens.accessToken,
        tokens.refreshToken,
        dto.rememberMe,
      );
      expectSuccess(result, 'Login successful.', userInfo);
    });

    it('logs and rethrows on error', async () => {
      authService.login.mockRejectedValue(new Error('Error'));
      await expectThrows(() => controller.login(dto, makeRes()));
      expectErrorLogged('Login error.');
    });
  });

  describe('getAccountInfo', () => {
    const req = makeReq(jwtUserMock);

    it('returns user info', async () => {
      const userInfo: IUserInfo = {
        id: 'user-id',
        email: req.user.email,
        username: 'user',
        createdAt: new Date(),
        isVerified: false,
      };
      authService.getAccountInfo.mockResolvedValue(userInfo);

      const result = await controller.getAccountInfo(req);

      expect(authService.getAccountInfo).toHaveBeenCalledWith(req.user.userId);
      expect(result).toEqual(userInfo);
    });

    it('logs and rethrows on error', async () => {
      authService.getAccountInfo.mockRejectedValue(new Error('Error'));
      await expectThrows(() => controller.getAccountInfo(req));
      expectErrorLogged('Get account info error.');
    });
  });

  describe('logout', () => {
    const req = makeReq(jwtUserMock);

    it('logs out, clears cookies, and returns success', async () => {
      authService.logout.mockResolvedValue(undefined);
      const res = makeRes();

      const result = await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith(
        req.user.userId,
        req.user.sessionId,
      );
      expect(cookiesService.clearAuthCookies).toHaveBeenCalledWith(res);
      expectSuccess(result, 'Logout successful.');
    });

    it('logs and rethrows on error', async () => {
      authService.logout.mockRejectedValue(new Error('Error'));
      await expectThrows(() => controller.logout(req, makeRes()));
      expectErrorLogged('Logout error.');
    });
  });

  describe('deleteAccount', () => {
    const req = makeReq(jwtUserMock);

    it('deletes user, clears cookies, and returns success', async () => {
      authService.deleteUser.mockResolvedValue(undefined);
      const res = makeRes();

      const result = await controller.deleteAccount(req, res);

      expect(authService.deleteUser).toHaveBeenCalledWith(req.user.userId);
      expect(cookiesService.clearAuthCookies).toHaveBeenCalledWith(res);
      expectSuccess(result, 'User deleted successfully.');
    });

    it('logs and rethrows on error', async () => {
      authService.deleteUser.mockRejectedValue(new Error('Error'));
      await expectThrows(() => controller.deleteAccount(req, makeRes()));
      expectErrorLogged('Delete account error.');
    });
  });
});
