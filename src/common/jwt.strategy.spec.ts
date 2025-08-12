import { JwtStrategy } from './jwt.strategy';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { configServiceMock } from 'test/mocks/commons.mock';
import { mockPrisma } from 'test/mocks/prisma.mock';

jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn(),
}));

const mockedJwtVerify = jwt.verify as jest.Mock;

const mockRequest = {
  cookies: { accessToken: 'valid-token' },
} as any;

const payload = { sub: 'user-id', email: 'user@email.com', tokenVersion: 1 };

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();

    jwtStrategy = new JwtStrategy(
      mockPrisma as any,
      configServiceMock as ConfigService,
    );
  });

  describe('jwtFromRequest', () => {
    it('extract token from cookies', () => {
      const extractor = (req: any) => req?.cookies?.accessToken || null;

      expect(extractor(mockRequest)).toBe('valid-token');
      expect(extractor({})).toBeNull();
    });
  });

  describe('validate', () => {
    it('throw UnauthorizedException if token is expired', async () => {
      mockedJwtVerify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await expect(jwtStrategy.validate(mockRequest, payload)).rejects.toThrow(
        new UnauthorizedException('Token expired'),
      );
    });

    it('throw UnauthorizedException if token is invalid', async () => {
      mockedJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(jwtStrategy.validate(mockRequest, payload)).rejects.toThrow(
        new UnauthorizedException('Invalid token'),
      );
    });

    it('throw UnauthorizedException if user not found', async () => {
      mockedJwtVerify.mockImplementation(() => payload);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      await expect(jwtStrategy.validate(mockRequest, payload)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        `User not found (ID: ${payload.sub}).`,
      );
    });

    it('throw UnauthorizedException if tokenVersion mismatches', async () => {
      mockedJwtVerify.mockImplementation(() => payload);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: payload.sub,
        tokenVersion: payload.tokenVersion + 1,
        email: payload.email,
      });

      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      await expect(jwtStrategy.validate(mockRequest, payload)).rejects.toThrow(
        new UnauthorizedException('Invalid token version'),
      );
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        `Token version mismatch (user ID: ${payload.sub}).`,
      );
    });

    it('return user data if token and user are valid', async () => {
      mockedJwtVerify.mockImplementation(() => payload);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: payload.sub,
        tokenVersion: payload.tokenVersion,
        email: payload.email,
      });

      const result = await jwtStrategy.validate(mockRequest, payload);

      expect(result).toEqual({
        userId: payload.sub,
        email: payload.email,
        tokenVersion: payload.tokenVersion,
      });
    });
  });
});
