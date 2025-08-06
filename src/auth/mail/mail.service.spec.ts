import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { configServiceMock, mockLoggerError } from 'test/mocks/commons.mock';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let configService: ConfigService;
  let sendMailMock: jest.Mock;
  let loggerErrorSpy: jest.SpyInstance;

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
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get(MailService);
    configService = module.get(ConfigService);
    loggerErrorSpy = mockLoggerError(service);
  });

  const email = 'user@email.com';

  it('should configure transporter with Gmail and auth from ConfigService', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: {
        user: configService.get('EMAIL_USER'),
        pass: configService.get('EMAIL_PASS'),
      },
    });
  });

  describe('sendVerificationEmail', () => {
    const token = 'verify-token';

    it('calls sendMail with correct verification link and subject', async () => {
      await service.sendVerificationEmail(email, token);

      const expectedUrl = `${configService.get('FRONTEND_URL')}/verification?verificationToken=${token}`;

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith({
        from: configService.get('EMAIL_USER'),
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
    const token = 'reset-token';
    it('calls sendMail with correct reset link and subject', async () => {
      await service.sendResetPasswordEmail(email, token);

      const expectedUrl = `${configService.get('FRONTEND_URL')}/auth/reset-password?resetToken=${token}`;
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith({
        from: configService.get('EMAIL_USER'),
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
