import { Body, Controller, Logger, Patch, Post, Query } from '@nestjs/common';
import { handleRequest } from 'src/common/utils/requestHandler';
import { EmailBase, PasswordBase } from '../auth.dto';
import { IResponseStatus } from 'src/common/common.types';
import { PasswordService } from './password.service';

@Controller('auth/password')
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  @Post('forgot-password')
  async forgotPassword(
    @Body() { email }: EmailBase,
  ): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        await this.passwordService.sendResetPasswordEmail(email);
        return {
          success: true,
          message: 'Password reset email sent successfully',
        };
      },
      'Error while sending reset password email',
      this.logger,
    );
  }

  @Patch('reset-password')
  async resetPassword(
    @Query('resetToken') resetToken: string,
    @Body() { password }: PasswordBase,
  ): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        await this.passwordService.resetPassword(resetToken, password);
        return { success: true, message: 'Password updated successfully' };
      },
      'Reset password error',
      this.logger,
    );
  }

  private readonly logger = new Logger(PasswordController.name);
}
