import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { TokensService } from '../tokens/tokens.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth.service';
import HashHandler from 'src/common/utils/hashHandler';

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
    const user = await this.authService.findUserBy({ email });
    const resetToken = this.tokenService.createResetPasswordToken(user);
    await this.mailService.sendResetPasswordEmail(email, resetToken);
  }

  async resetPassword(resetToken: string, password: string): Promise<void> {
    const { userId, tokenVersion } =
      this.tokenService.verifyResetPasswordToken(resetToken);
    const hashedPassword = await HashHandler.hashString(password);
    await this.prisma.user.update({
      where: { id: userId, tokenVersion },
      data: { password: hashedPassword, tokenVersion: { increment: 1 } },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}
