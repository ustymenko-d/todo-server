import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokensService } from 'src/auth/tokens/tokens.service';
import { MailService } from 'src/auth/mail/mail.service';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import HashHandler from 'src/common/utils/HashHandler';
import { v4 as uuidv4 } from 'uuid';
import { mockPrisma } from 'test/mocks/prisma.mock';
import { mockTokensService, TTokensServiceMock } from 'test/mocks/tokens.mock';
import { userMock } from 'test/mocks/auth.mock';
import { IUserInfo } from './auth.types';

jest.mock('uuid', () => ({ v4: jest.fn() }));
jest.mock('src/common/utils/HashHandler', () => ({
  __esModule: true,
  default: {
    hashString: jest.fn(),
    compareString: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let tokensService: TTokensServiceMock;
  let mailService: Partial<MailService>;

  const setupMocks = () => {
    (uuidv4 as jest.Mock).mockReturnValue('uuid-1');
    (HashHandler.hashString as jest.Mock).mockResolvedValue('hashed-pass');
    (HashHandler.compareString as jest.Mock).mockResolvedValue(true);
  };

  const expectUserInfo = (result: any, userInfo: IUserInfo) => {
    expect(result.userInfo).toEqual(userInfo);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    setupMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TokensService, useFactory: mockTokensService },
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    tokensService = module.get(TokensService);
    mailService = module.get(MailService);
  });

  describe('signup', () => {
    it('creates user, sends email, returns tokens & userInfo', async () => {
      mockPrisma.user.create.mockResolvedValue(userMock);
      tokensService.createAccessToken = jest
        .fn()
        .mockReturnValue('access-token');
      tokensService.createRefreshToken = jest
        .fn()
        .mockResolvedValue('refresh-token');

      const result = await service.signup(userMock.email, userMock.password);

      expect(HashHandler.hashString).toHaveBeenCalledWith(userMock.password);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userMock.email,
          username: userMock.username,
          password: 'hashed-pass',
          tokenVersion: 1,
          verificationToken: 'uuid-1',
        },
      });
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        userMock.email,
        'uuid-1',
      );
      expect(tokensService.createAccessToken).toHaveBeenCalledWith(
        userMock,
        'uuid-1',
      );
      expect(tokensService.createRefreshToken).toHaveBeenCalledWith(
        userMock.id,
        'uuid-1',
      );
      expectUserInfo(result, {
        id: userMock.id,
        email: userMock.email,
        username: userMock.username,
        createdAt: userMock.createdAt,
        isVerified: userMock.isVerified,
      });
    });

    it('throws InternalServerErrorException on create error', async () => {
      mockPrisma.user.create.mockRejectedValue(new Error('Error'));
      await expect(service.signup('email', 'pass123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('verifyEmail', () => {
    it('updates isVerified to true', async () => {
      mockPrisma.user.update.mockResolvedValue({});
      await expect(
        service.verifyEmail('verification-token'),
      ).resolves.toBeUndefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { verificationToken: 'verification-token' },
        data: { isVerified: true, verificationToken: null },
      });
    });
  });

  describe('resendVerificationEmail', () => {
    it('throws ConflictException if already verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isVerified: true,
        verificationToken: 'verification-token',
      });
      await expect(
        service.resendVerificationEmail('user@email.com'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if no token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isVerified: false,
        verificationToken: null,
      });
      await expect(
        service.resendVerificationEmail('user@email.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('sends email if unverified with token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isVerified: false,
        verificationToken: 'verification-token',
      });
      await service.resendVerificationEmail('user@email.com');
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'user@email.com',
        'verification-token',
      );
    });
  });

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      jest.spyOn(service, 'findUserBy').mockResolvedValue(userMock);
      tokensService.createAccessToken = jest
        .fn()
        .mockReturnValue('access-token');
      tokensService.createRefreshToken = jest
        .fn()
        .mockResolvedValue('refresh-token');

      const result = await service.login(userMock.email, 'pass123');

      expect(service.findUserBy).toHaveBeenCalledWith({
        email: userMock.email,
      });
      expect(HashHandler.compareString).toHaveBeenCalledWith(
        'pass123',
        userMock.password,
      );
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('throws UnauthorizedException on bad password', async () => {
      jest.spyOn(service, 'findUserBy').mockResolvedValue(userMock);
      (HashHandler.compareString as jest.Mock).mockResolvedValue(false);
      await expect(service.login(userMock.email, 'pass123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes tokens', async () => {
      tokensService.revokePreviousTokens = jest
        .fn()
        .mockResolvedValue(undefined);
      await service.logout('user-id', 'session-id');
      expect(tokensService.revokePreviousTokens).toHaveBeenCalledWith(
        'user-id',
        'session-id',
      );
    });
  });

  describe('getAccountInfo', () => {
    it('returns userInfo', async () => {
      jest.spyOn(service, 'findUserBy').mockResolvedValue(userMock);
      const result = await service.getAccountInfo('user-id');
      expect(result).toEqual({
        id: userMock.id,
        email: userMock.email,
        username: userMock.username,
        createdAt: userMock.createdAt,
        isVerified: userMock.isVerified,
      });
    });
  });

  describe('deleteUser', () => {
    it('deletes user', async () => {
      mockPrisma.user.delete = jest.fn().mockResolvedValue({});
      await service.deleteUser('user-id');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
    });
  });

  describe('findUserBy', () => {
    it('returns user if found', async () => {
      mockPrisma.user.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 'user-id' } as any);
      const user = await service.findUserBy({ id: 'user-id' });
      expect(user).toEqual({ id: 'user-id' });
    });

    it('throws NotFoundException if not found', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);
      await expect(service.findUserBy({ id: 'user-id' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
