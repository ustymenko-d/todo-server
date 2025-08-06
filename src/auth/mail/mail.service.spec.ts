import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let sendMailMock: jest.Mock;
  let loggerErrorSpy: jest.SpyInstance;

  const FRONTEND_URL = 'https://app.test';
  const EMAIL_USER = 'noreply@test.com';
  const EMAIL_PASS = 'pass123';

  beforeEach(async () => {
    jest.clearAllMocks();

    sendMailMock = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'FRONTEND_URL':
                  return FRONTEND_URL;
                case 'EMAIL_USER':
                  return EMAIL_USER;
                case 'EMAIL_PASS':
                  return EMAIL_PASS;
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get(MailService);
    // spy logger.error
    loggerErrorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should configure transporter with Gmail and auth from ConfigService', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
  });

  describe('sendVerificationEmail', () => {
    const email = 'user@test.com';
    const token = 'verify-token';

    it('calls sendMail with correct verification link and subject', async () => {
      await service.sendVerificationEmail(email, token);

      const expectedUrl = `${FRONTEND_URL}/verification?verificationToken=${token}`;

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith({
        from: EMAIL_USER,
        to: email,
        subject: 'Verify your email on uTodo',
        html: expect.stringContaining(expectedUrl),
      });
    });

    it('logs error when sendMail throws', async () => {
      const err = new Error('SMTP down');

      sendMailMock.mockRejectedValueOnce(err);

      await service.sendVerificationEmail(email, token);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Email sending error:',
        expect.objectContaining({
          message: err.message,
          stack: err.stack,
        }),
      );
    });
  });

  describe('sendResetPasswordEmail', () => {
    const email = 'user2@test.com';
    const token = 'reset-token';
    it('calls sendMail with correct reset link and subject', async () => {
      await service.sendResetPasswordEmail(email, token);

      const expectedUrl = `${FRONTEND_URL}/auth/reset-password?resetToken=${token}`;
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith({
        from: EMAIL_USER,
        to: email,
        subject: 'Reset Your uTodo password',
        html: expect.stringContaining(expectedUrl),
      });
    });

    it('logs error when sendMail throws', async () => {
      const err = Object.assign(new Error('SMTP error'), { code: 'ECONN' });
      sendMailMock.mockRejectedValueOnce(err);

      await service.sendResetPasswordEmail(email, token);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Email sending error:',
        expect.objectContaining({
          message: err.message,
          code: err.code,
          stack: err.stack,
        }),
      );
    });
  });
});
