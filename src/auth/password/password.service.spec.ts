import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';
import { AuthService } from '../auth.service';
import { TokensService } from '../tokens/tokens.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import HashHandler from 'src/common/utils/HashHandler';
import { mockPrisma } from 'test/mocks/prisma.mock';
import { expectThrows } from 'test/utils/expectThrows';

jest.mock('src/common/utils/HashHandler', () => ({
  __esModule: true,
  default: { hashString: jest.fn() },
}));

describe('PasswordService', () => {
  let service: PasswordService;

  const mockAuthService = {
    findUserBy: jest.fn(),
  };
  const mockTokensService = {
    createResetPasswordToken: jest.fn(),
    verifyResetPasswordToken: jest.fn(),
  };
  const mockMailService = {
    sendResetPasswordEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: TokensService, useValue: mockTokensService },
        { provide: MailService, useValue: mockMailService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PasswordService);
  });

  describe('sendResetPasswordEmail', () => {
    const email = 'user@email.com';

    it('fetches user, creates token and sends email', async () => {
      const user = { id: 'user-id' };
      const token = 'token';

      mockAuthService.findUserBy.mockResolvedValue(user);
      mockTokensService.createResetPasswordToken.mockReturnValue(token);

      await service.sendResetPasswordEmail(email);

      expect(mockAuthService.findUserBy).toHaveBeenCalledWith({ email });
      expect(mockTokensService.createResetPasswordToken).toHaveBeenCalledWith(
        user,
      );
      expect(mockMailService.sendResetPasswordEmail).toHaveBeenCalledWith(
        email,
        token,
      );
    });

    it('propagates if authService.findUserBy throws', async () => {
      mockAuthService.findUserBy.mockRejectedValue(new Error('Error'));

      await expectThrows(() => service.sendResetPasswordEmail(email));
    });
  });

  describe('resetPassword', () => {
    it('verifies token, hashes password, updates user and revokes tokens', async () => {
      const resetToken = 'token';
      const newPassword = 'pass123';
      const hash = 'hashed-pass123';
      const payload = { userId: 'user-id', tokenVersion: 2 };

      mockTokensService.verifyResetPasswordToken.mockReturnValue(payload);
      (HashHandler.hashString as jest.Mock).mockResolvedValue(hash);

      await service.resetPassword(resetToken, newPassword);

      expect(mockTokensService.verifyResetPasswordToken).toHaveBeenCalledWith(
        resetToken,
      );
      expect(HashHandler.hashString).toHaveBeenCalledWith(newPassword);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: payload.userId, tokenVersion: payload.tokenVersion },
        data: { password: hash, tokenVersion: { increment: 1 } },
      });
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: payload.userId, revoked: false },
        data: { revoked: true },
      });
    });

    it('propagates if verifyResetPasswordToken throws', async () => {
      mockTokensService.verifyResetPasswordToken.mockImplementation(() => {
        throw new Error('Error');
      });

      await expectThrows(() => service.resetPassword('', 'pwd'));
    });
  });
});
