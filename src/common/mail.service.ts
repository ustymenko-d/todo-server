import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }

  async sendVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<void> {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}?verificationToken=${verificationToken}`;
      const html = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify Your Email</title></head><body style="font-family:Arial,sans-serif;padding:20px;color:#09090b"><div style="max-width:600px;margin:0 auto;background:#fafafa;padding:20px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);text-align:center;border:1px solid #d4d4d8"><h2 style="color:#09090b">Welcome to UpTodo!</h2><p style="color:#09090b">Thank you for creating your account! Please verify your email using the link below. If you don’t verify your email within a week, your account will be deleted.</p><a href="${verificationUrl}" style="display:inline-block;padding:10px 20px;background-color:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">Verify Email</a></div></body></html>`;

      await this.sendEmail(email, `Verify your email on UpTodo`, html);
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}?resetToken=${resetToken}`;
      const html = `
      <!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset Your UpTodo password</title></head><body style="font-family:Arial,sans-serif;padding:20px;color:#09090b"><div style="max-width:600px;margin:0 auto;background:#fafafa;padding:20px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);text-align:center;border:1px solid #d4d4d8"><h2 style="color:#09090b">Reset Your UpTodo password</h2><p style="color:#09090b">This link will expire after 30 minutes. If you didn't request a password reset you can delete this email.</p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background-color:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">Reset password</a></div></body></html>`;

      await this.sendEmail(email, `Reset Your UpTodo password`, html);
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }
}
