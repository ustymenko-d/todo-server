import {
  Body,
  Controller,
  Logger,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { handleRequest } from 'src/common/utils/requestHandler';
import { EmailBase, PasswordBase } from '../auth.dto';
import { IResponseStatus } from 'src/common/common.types';
import { PasswordService } from './password.service';
import { RecaptchaGuard } from 'src/common/recaptcha.guard';
import { StripRecaptchaInterceptor } from 'src/common/strip-recaptcha.interceptor';

@Controller('auth/password')
export class PasswordController {
  private readonly logger = new Logger(PasswordController.name);

  constructor(private readonly passwordService: PasswordService) {}

  @Post('forgot-password')
  @UseGuards(RecaptchaGuard)
  @UseInterceptors(StripRecaptchaInterceptor)
  async forgotPassword(@Body() { email }: EmailBase): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        await this.passwordService.sendResetPasswordEmail(email);
        return {
          success: true,
          message: 'Reset password email sent successfully.',
        };
      },
      'Error while sending reset password email.',
      this.logger,
    );
  }

  @Patch('reset-password')
  @UseGuards(RecaptchaGuard)
  @UseInterceptors(StripRecaptchaInterceptor)
  async resetPassword(
    @Query('resetToken') resetToken: string,
    @Body() { password }: PasswordBase,
  ): Promise<IResponseStatus> {
    return handleRequest(
      async () => {
        await this.passwordService.resetPassword(resetToken, password);
        return { success: true, message: 'Password updated successfully.' };
      },
      'Reset password error.',
      this.logger,
    );
  }
}
