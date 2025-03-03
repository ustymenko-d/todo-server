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

      const verificationUrl = `${process.env.FRONTEND_URL}/auth/verification?verificationToken=${verificationToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Verify your email on UpTodo`,
        html: `
       <!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify Your Email</title></head><body style="font-family:Arial,sans-serif;background-color:#f4f4f5;padding:20px;color:#09090b"><div style="max-width:600px;margin:0 auto;background:#fafafa;padding:20px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);text-align:center;border:1px solid #d4d4d8"><h2 style="color:#09090b">Welcome to UpTodo!</h2><p style="color:#09090b">Thanks for creating your account, please verify your email with the link below.</p><a href="${verificationUrl}" style="display:inline-block;padding:10px 20px;background-color:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">Verify Email</a></div></body></html>`,
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

      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?resetToken=${resetToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Reset Your UpTodo password`,
        html: `
        <p>Click <a href="${resetUrl}">here</a> to reset your password. This link is valid for 15 minutes.</p>
          <!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset Your UpTodo password</title></head><body style="font-family:Arial,sans-serif;background-color:#f4f4f5;padding:20px;color:#09090b"><div style="max-width:600px;margin:0 auto;background:#fafafa;padding:20px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,.1);text-align:center;border:1px solid #d4d4d8"><h2 style="color:#09090b">Reset Your UpTodo password</h2><p style="color:#09090b">This link will expire after 30 minutes. If you didn't request a password reset you can delete this email.</p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background-color:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">Verify Email</a></div></body></html>`,
      });
    } catch (error) {
      this.logger.error(error.stack);
      throw error;
    }
  }
}
