import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { handleRequest } from 'src/common/utils/request-handler.util';
import * as bcrypt from 'bcrypt';
import { TokensService } from '../tokens/tokens.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth.service';

@Injectable()
export class PasswordService {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly tokenService: TokensService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async sendResetPasswordEmail(email: string): Promise<void> {
    return handleRequest(
      async () => {
        const user = await this.authService.findUserBy({ email });
        const resetToken = this.tokenService.createResetPasswordToken(user);
        await this.mailService.sendResetPasswordEmail(email, resetToken);
      },
      'Reset password email send failed',
      true,
    );
  }

  async resetPassword(resetToken: string, password: string): Promise<void> {
    return handleRequest(
      async () => {
        const { userId, tokenVersion } =
          this.tokenService.verifyResetPasswordToken(resetToken);
        const { id } = await this.authService.findUserBy({
          id: userId,
          tokenVersion,
        });
        const hashedPassword = await this.hashPassword(password);

        await this.prisma.user.update({
          where: { id },
          data: { password: hashedPassword, tokenVersion: { increment: 1 } },
        });
      },
      'Reset password failed',
      true,
    );
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePasswords(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
