import { DatabaseService } from '../database/database.service';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;
  let mockDb: Partial<DatabaseService>;
  let mockConfig: Partial<ConfigService>;

  const secret = 'test-secret';
  const payload = { sub: '123', email: 'user@email.com', tokenVersion: 1 };

  beforeEach(() => {
    mockConfig = { get: jest.fn().mockReturnValue(secret) };
    mockDb = { user: { findUnique: jest.fn() } } as any;
    jwtStrategy = new JwtStrategy(
      mockDb as DatabaseService,
      mockConfig as ConfigService,
    );
  });

  it('should throw UnauthorizedException for invalid payload', async () => {
    await expect(jwtStrategy.validate({} as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw when user not found', async () => {
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      `User not found (ID: ${payload.sub}).`,
    );
  });

  it('should throw when tokenVersion mismatches', async () => {
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
      id: '123',
      tokenVersion: 2,
      email: 'user@email.com',
    });
    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      'Invalid token version.',
    );
  });

  it('should return user data when valid', async () => {
    const userRecord = { id: '123', tokenVersion: 1, email: 'user@email.com' };
    (mockDb.user.findUnique as jest.Mock).mockResolvedValue(userRecord);
    const result = await jwtStrategy.validate(payload);
    expect(result).toEqual({
      userId: '123',
      email: 'user@email.com',
      tokenVersion: 1,
    });
  });
});
