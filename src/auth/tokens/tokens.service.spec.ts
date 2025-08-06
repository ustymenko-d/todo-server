import { Test, TestingModule } from '@nestjs/testing';
import { TokensService } from './tokens.service';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import HashHandler from 'src/common/utils/HashHandler';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import {
  mockAuthService,
  TAuthServiceMock,
  userMock,
} from 'test/mocks/auth.mock';
import { mockPrisma } from 'test/mocks/prisma.mock';
import { configServiceMock } from 'test/mocks/commons.mock';

jest.mock('uuid', () => ({ v4: jest.fn() }));
jest.mock('src/common/utils/HashHandler', () => ({
  __esModule: true,
  default: {
    hashString: jest.fn(),
    compareString: jest.fn(),
  },
}));

describe('TokensService', () => {
  let service: TokensService;
  let jwtService: jest.Mocked<JwtService>;
  let authService: TAuthServiceMock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        {
          provide: JwtService,
          useValue: {
            decode: jest.fn(),
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        { provide: AuthService, useFactory: mockAuthService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get(TokensService);
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    authService = module.get(AuthService);
  });

  describe('decodeAccessToken', () => {
    it('should decode and extract userId and sessionId', () => {
      jwtService.decode.mockReturnValue({
        sub: 'user-id',
        sessionId: 'session-1',
      });
      const result = service.decodeAccessToken('token');
      expect(jwtService.decode).toHaveBeenCalledWith('token');
      expect(result).toEqual({ userId: 'user-id', sessionId: 'session-1' });
    });
  });

  describe('createAccessToken', () => {
    it('sign payload with user data and sessionId', () => {
      jwtService.sign.mockReturnValue('signed-token');

      const token = service.createAccessToken(userMock, 'session-1');

      expect(jwtService.sign).toHaveBeenCalledWith({
        email: 'user@email.com',
        sub: 'user-id',
        tokenVersion: 1,
        sessionId: 'session-1',
      });
      expect(token).toBe('signed-token');
    });
  });

  describe('createRefreshToken', () => {
    it('generate, hash, store and return raw token', async () => {
      (uuidv4 as jest.Mock).mockReturnValue('raw-uuid');
      (HashHandler.hashString as jest.Mock).mockResolvedValue('hashed-uuid');

      const now = new Date();

      jest.spyOn(global, 'Date').mockImplementation(() => now);

      mockPrisma.refreshToken.create.mockResolvedValue(undefined);
      const result = await service.createRefreshToken('user-id', 'session-1');
      expect(uuidv4).toHaveBeenCalled();
      expect(HashHandler.hashString).toHaveBeenCalledWith('raw-uuid');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-id',
          token: 'hashed-uuid',
          expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
          sessionId: 'session-1',
        },
      });
      expect(result).toBe('raw-uuid');
    });
  });

  describe('verifyRefreshToken', () => {
    it('throws if no record found', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyRefreshToken('user-id', 'refresh-token', 'session-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws if compareString returns false', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({ token: 'h' });
      (HashHandler.compareString as jest.Mock).mockResolvedValue(false);
      await expect(
        service.verifyRefreshToken('user-id', 'refresh-token', 'session-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('resolves when token matches', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({ token: 'h' });
      (HashHandler.compareString as jest.Mock).mockResolvedValue(true);
      await expect(
        service.verifyRefreshToken('user-id', 'refresh-token', 'session-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('revokePreviousTokens', () => {
    it('calls updateMany with correct criteria', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue(undefined);
      await service.revokePreviousTokens('user-id', 'session-1');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id', sessionId: 'session-1', revoked: false },
        data: { revoked: true },
      });
    });
  });

  describe('refreshTokens', () => {
    it('full flow: verify, find user, create tokens, revoke old', async () => {
      jest.spyOn(service, 'verifyRefreshToken').mockResolvedValue(undefined);
      authService.findUserBy!.mockResolvedValue({
        id: 'user-id',
        email: 'user@email.com',
        tokenVersion: 1,
      });
      jest.spyOn(service, 'createAccessToken').mockReturnValue('access-token');
      jest.spyOn(service, 'revokePreviousTokens').mockResolvedValue(undefined);
      jest
        .spyOn(service, 'createRefreshToken')
        .mockResolvedValue('refresh-token');

      const result = await service.refreshTokens(
        'user-id',
        'old-refresh-token',
        'session-1',
      );
      expect(service.verifyRefreshToken).toHaveBeenCalledWith(
        'user-id',
        'old-refresh-token',
        'session-1',
      );
      expect(authService.findUserBy).toHaveBeenCalledWith({ id: 'user-id' });
      expect(service.createAccessToken).toHaveBeenCalled();
      expect(service.revokePreviousTokens).toHaveBeenCalledWith(
        'user-id',
        'session-1',
      );
      expect(service.createRefreshToken).toHaveBeenCalledWith(
        'user-id',
        'session-1',
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('reset password token methods', () => {
    it('create ResetPasswordToken signs with reset secret and 30m expiry', () => {
      (jwtService.sign as jest.Mock).mockReturnValue('reset-token');

      const token = service.createResetPasswordToken({
        id: 'user-id',
        tokenVersion: 2,
      } as any);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { userId: 'user-id', tokenVersion: 2 },
        { secret: 'jwt-reset-secret', expiresIn: '30m' },
      );
      expect(token).toBe('reset-token');
    });

    it('verifyResetPasswordToken uses reset secret', () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ foo: 'bar' });
      const decoded = service.verifyResetPasswordToken('t');
      expect(jwtService.verify).toHaveBeenCalledWith('t', {
        secret: 'jwt-reset-secret',
      });
      expect(decoded).toEqual({ foo: 'bar' });
    });
  });
});
