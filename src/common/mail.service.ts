import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  PasswordResetMailDto,
  VerificationPayloadDto,
} from 'src/auth/auth.dto';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendVerificationEmail({
    email,
    verificationToken,
  }: VerificationPayloadDto): Promise<void> {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const verificationUrl = `${process.env.FRONTEND_URL}/auth/verification?token=${verificationToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Verify your email on ${process.env.FRONTEND_URL}`,
        html: `<p>Please click <a href="${verificationUrl}">this link</a> to verify your email.</p>`,
      });
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }

  async sendPasswordResetEmail({
    email,
    resetToken,
  }: PasswordResetMailDto): Promise<void> {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Reset Your Password on ${process.env.FRONTEND_URL}`,
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link is valid for 15 minutes.</p>`,
      });
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }
}
