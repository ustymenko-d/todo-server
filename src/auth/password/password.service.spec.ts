import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';
import { AuthService } from '../auth.service';
import { TokensService } from '../tokens/tokens.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { mockPrisma } from 'test/mocks/prisma.mock';
import { expectThrows } from 'test/utils/expectThrows';
import { mockTokensService, TTokensServiceMock } from 'test/mocks/tokens.mock';
import { mockAuthService, TAuthServiceMock } from 'test/mocks/auth.mock';
import HashHandler from 'src/common/utils/HashHandler';

jest.mock('src/common/utils/HashHandler', () => ({
  __esModule: true,
  default: { hashString: jest.fn() },
}));

describe('PasswordService', () => {
  let service: PasswordService;
  let authService: TAuthServiceMock;
  let tokensService: TTokensServiceMock;
  let mailService: Partial<MailService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        { provide: AuthService, useFactory: mockAuthService },
        { provide: TokensService, useFactory: mockTokensService },
        {
          provide: MailService,
          useValue: {
            sendResetPasswordEmail: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PasswordService);
    authService = module.get(AuthService);
    tokensService = module.get(TokensService);
    mailService = module.get(MailService);
  });

  describe('sendResetPasswordEmail', () => {
    const email = 'user@email.com';

    it('fetches user, creates token and sends email', async () => {
      const user = { id: 'user-id' };
      const token = 'token';

      authService.findUserBy.mockResolvedValue(user);
      tokensService.createResetPasswordToken.mockReturnValue(token);

      await service.sendResetPasswordEmail(email);

      expect(authService.findUserBy).toHaveBeenCalledWith({ email });
      expect(tokensService.createResetPasswordToken).toHaveBeenCalledWith(user);
      expect(mailService.sendResetPasswordEmail).toHaveBeenCalledWith(
        email,
        token,
      );
    });

    it('propagates if authService.findUserBy throws', async () => {
      authService.findUserBy.mockRejectedValue(new Error('Error'));

      await expectThrows(() => service.sendResetPasswordEmail(email));
    });
  });

  describe('resetPassword', () => {
    it('verifies token, hashes password, updates user and revokes tokens', async () => {
      const resetToken = 'token';
      const newPassword = 'pass123';
      const hash = 'hashed-pass123';
      const payload = { userId: 'user-id', tokenVersion: 2 };

      tokensService.verifyResetPasswordToken.mockReturnValue(payload);
      (
        HashHandler as jest.Mocked<typeof HashHandler>
      ).hashString.mockResolvedValue(hash);

      await service.resetPassword(resetToken, newPassword);

      expect(tokensService.verifyResetPasswordToken).toHaveBeenCalledWith(
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
      tokensService.verifyResetPasswordToken.mockImplementation(() => {
        throw new Error('Error');
      });

      await expectThrows(() => service.resetPassword('', 'pwd'));
    });
  });
});
