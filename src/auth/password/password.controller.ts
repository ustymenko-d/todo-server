import { Body, Controller, Patch, Post, Query } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { handleRequest } from 'src/common/utils/request-handler.util';
import { EmailBaseDto, PasswordBaseDto } from '../auth.dto';
import { IResponseStatus } from 'src/common/common.types';

@Controller('password')
export class PasswordController {
  constructor(private readonly authService: AuthService) {}

  @Post('forgot-password')
  async forgotPassword(
    @Body() { email }: EmailBaseDto,
  ): Promise<IResponseStatus> {
    return handleRequest(async () => {
      await this.authService.sendResetPasswordEmail(email);
      return {
        success: true,
        message: 'Password reset email sent successfully',
      };
    }, 'Error while sending reset password email');
  }

  @Patch('reset-password')
  async resetPassword(
    @Query('resetToken') resetToken: string,
    @Body() { password }: PasswordBaseDto,
  ): Promise<IResponseStatus> {
    return handleRequest(async () => {
      await this.authService.resetPassword(resetToken, password);
      return { success: true, message: 'Password updated successfully' };
    }, 'Reset password error');
  }
}
