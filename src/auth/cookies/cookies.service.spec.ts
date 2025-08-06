import { Test, TestingModule } from '@nestjs/testing';
import { CookiesService } from './cookies.service';
import { ConfigService } from '@nestjs/config';
import { createResponseMock } from 'test/mocks/cookies.mock';

describe('CookiesService', () => {
  let service: CookiesService;
  const response = createResponseMock();

  const createModuleWithEnv = async (env: string) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookiesService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'NODE_ENV' ? env : null),
          },
        },
      ],
    }).compile();

    return module.get(CookiesService);
  };

  const getCookieOptions = (env: string, rememberMe: boolean) => {
    const isProd = env === 'production';
    const baseOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    };

    return rememberMe ? { ...baseOptions, maxAge: 43200000 } : baseOptions;
  };

  const expectCookieCalledWith = (
    spy: jest.SpyInstance,
    name: string,
    value: string,
    options?: Partial<Record<string, unknown>>,
  ) => {
    expect(spy).toHaveBeenCalledWith(
      name,
      value,
      expect.objectContaining(options ?? {}),
    );
  };

  const expectAllCookiesSet = (
    spy: jest.SpyInstance,
    env: string,
    rememberMe: boolean,
    accessToken: string,
    refreshToken: string,
  ) => {
    const options = getCookieOptions(env, rememberMe);

    expect(spy).toHaveBeenCalledTimes(3);
    expectCookieCalledWith(spy, 'accessToken', accessToken, options);
    expectCookieCalledWith(spy, 'refreshToken', refreshToken, options);
    expectCookieCalledWith(spy, 'rememberMe', rememberMe.toString(), options);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clearAuthCookies', () => {
    it('calls clearCookie for accessToken, refreshToken, and rememberMe', async () => {
      service = await createModuleWithEnv('production');
      const spy = jest.spyOn(response, 'clearCookie');

      service.clearAuthCookies(response);

      expect(spy).toHaveBeenCalledTimes(3);
      ['accessToken', 'refreshToken', 'rememberMe'].forEach((cookieName) => {
        expect(spy).toHaveBeenCalledWith(cookieName, expect.any(Object));
      });
    });
  });

  describe.each([
    ['development', false],
    ['production', true],
  ])('setAuthCookies in %s env with rememberMe=%s', (env, rememberMe) => {
    it('sets cookies correctly', async () => {
      service = await createModuleWithEnv(env);
      const spy = jest.spyOn(response, 'cookie');

      service.setAuthCookies(
        response,
        'access-token',
        'refresh-token',
        rememberMe,
      );

      expectAllCookiesSet(
        spy,
        env,
        rememberMe,
        'access-token',
        'refresh-token',
      );
    });
  });
});
