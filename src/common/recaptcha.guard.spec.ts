import { RecaptchaGuard } from './recaptcha.guard';
import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import fetch from 'node-fetch';

jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('RecaptchaGuard', () => {
  let guard: RecaptchaGuard;
  let context: Partial<ExecutionContext>;
  let request: any;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    guard = new RecaptchaGuard();
    request = { body: {}, method: 'POST', url: '/test', ip: '1.2.3.4' };
    context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as ExecutionContext;
    // Spy on Logger.warn only
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    process.env.RECAPTCHA_SECRET_KEY = 'secret-key';
    mockedFetch.mockClear();
  });

  it('throws ForbiddenException when no token provided', async () => {
    await expect(
      guard.canActivate(context as ExecutionContext),
    ).rejects.toThrow(ForbiddenException);
    expect(warnSpy).toHaveBeenCalledWith('No reCAPTCHA token provided');
  });

  it('throws ForbiddenException when Google response success=false', async () => {
    request.body.recaptchaToken = 'token';
    const jsonMock = jest.fn().mockResolvedValue({ success: false, score: 1 });
    mockedFetch.mockResolvedValue({ json: jsonMock } as any);

    await expect(
      guard.canActivate(context as ExecutionContext),
    ).rejects.toThrow('reCAPTCHA validation failed');
  });

  it('throws ForbiddenException when score < 0.5', async () => {
    request.body.recaptchaToken = 'token';
    const jsonMock = jest.fn().mockResolvedValue({ success: true, score: 0.3 });
    mockedFetch.mockResolvedValue({ json: jsonMock } as any);

    await expect(
      guard.canActivate(context as ExecutionContext),
    ).rejects.toThrow('reCAPTCHA validation failed');
  });

  it('returns true when success=true and score>=0.5', async () => {
    request.body.recaptchaToken = 'token';
    const jsonMock = jest.fn().mockResolvedValue({ success: true, score: 0.7 });
    mockedFetch.mockResolvedValue({ json: jsonMock } as any);

    await expect(guard.canActivate(context as ExecutionContext)).resolves.toBe(
      true,
    );
  });

  it('returns true when success=true and no score provided', async () => {
    request.body.recaptchaToken = 'token';
    const jsonMock = jest.fn().mockResolvedValue({ success: true });
    mockedFetch.mockResolvedValue({ json: jsonMock } as any);

    await expect(guard.canActivate(context as ExecutionContext)).resolves.toBe(
      true,
    );
  });
});
