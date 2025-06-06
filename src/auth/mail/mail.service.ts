import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly frontendUrl: string;
  private readonly emailUser: string;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL');
    this.emailUser = this.configService.get<string>('EMAIL_USER');

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.emailUser,
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.emailUser,
      to,
      subject,
      html,
    });
  }

  async sendVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verification?verificationToken=${verificationToken}`;
    const html = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify Your Email</title></head><body style="font-family:Arial,sans-serif;padding:20px;color:#09090b"><div style="max-width:600px;margin:0 auto;background:#fafafa;padding:20px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);text-align:center;border:1px solid #d4d4d8"><h2 style="color:#09090b">Welcome to UpTodo!</h2><p style="color:#09090b">Thank you for creating your account! Please verify your email using the link below. If you don’t verify your email within three days, your account will be deleted.</p><a href="${verificationUrl}" style="display:inline-block;padding:10px 20px;background-color:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">Verify Email</a></div></body></html>`;

    await this.sendEmail(email, `Verify your email on UpTodo`, html);
  }

  async sendResetPasswordEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?resetToken=${resetToken}`;
    const html = `
      <!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset Your UpTodo password</title></head><body style="font-family:Arial,sans-serif;padding:20px;color:#09090b"><div style="max-width:600px;margin:0 auto;background:#fafafa;padding:20px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);text-align:center;border:1px solid #d4d4d8"><h2 style="color:#09090b">Reset Your UpTodo password</h2><p style="color:#09090b">This link will expire after 30 minutes. If you didn't request a password reset you can delete this email.</p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background-color:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">Reset password</a></div></body></html>`;

    await this.sendEmail(email, `Reset Your UpTodo password`, html);
  }
}
