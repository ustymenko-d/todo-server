import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class RecaptchaGuard implements CanActivate {
  private readonly logger = new Logger(RecaptchaGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.body.recaptchaToken;

    this.logger.debug(`Incoming request to ${req.method} ${req.url}`);
    this.logger.debug(
      `recaptchaToken in body: ${token ? 'present' : 'missing'}`,
    );

    if (!token) {
      this.logger.warn('No reCAPTCHA token provided');
      throw new ForbiddenException('No reCAPTCHA token');
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const googleRes = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secret}&response=${token}&remoteip=${req.ip}`,
      },
    );

    const { success, score } = await googleRes.json();
    this.logger.debug(
      `Google reCAPTCHA response: success=${success}, score=${score}`,
    );

    if (!success || (score !== undefined && score < 0.5))
      throw new ForbiddenException('reCAPTCHA validation failed');

    return true;
  }
}
