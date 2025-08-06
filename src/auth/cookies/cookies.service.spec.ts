import { Test, TestingModule } from '@nestjs/testing';
import { CookiesService } from './cookies.service';
import { ConfigService } from '@nestjs/config';
import { createResponseMock } from 'test/mocks/cookies.mock';

describe('CookiesService', () => {
  let service: CookiesService;

  const createModuleWithEnv = async (env: string) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookiesService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'NODE_ENV' ? env : null) },
        },
      ],
    }).compile();

    return module.get(CookiesService);
  };

  const res = createResponseMock();

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('clearAuthCookies', () => {
    it('calls clearCookie for accessToken, refreshToken, and rememberMe', async () => {
      service = await createModuleWithEnv('production');
      const spy = jest.spyOn(res, 'clearCookie');

      service.clearAuthCookies(res);

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith('accessToken', expect.any(Object));
      expect(spy).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(spy).toHaveBeenCalledWith('rememberMe', expect.any(Object));
    });
  });

  describe('setAuthCookies', () => {
    it('sets all cookies without maxAge if rememberMe=false', async () => {
      service = await createModuleWithEnv('development');
      const spy = jest.spyOn(res, 'cookie');

      service.setAuthCookies(res, 'a-token', 'r-token', false);

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith(
        'accessToken',
        'a-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
        }),
      );
      expect(spy).toHaveBeenCalledWith(
        'refreshToken',
        'r-token',
        expect.any(Object),
      );
      expect(spy).toHaveBeenCalledWith(
        'rememberMe',
        'false',
        expect.any(Object),
      );
    });

    it('sets all cookies with maxAge if rememberMe=true', async () => {
      service = await createModuleWithEnv('production');
      const spy = jest.spyOn(res, 'cookie');

      service.setAuthCookies(res, 'a-token', 'r-token', true);

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith(
        'accessToken',
        'a-token',
        expect.objectContaining({
          maxAge: 43200000, // 12h
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        }),
      );
      expect(spy).toHaveBeenCalledWith(
        'refreshToken',
        'r-token',
        expect.any(Object),
      );
      expect(spy).toHaveBeenCalledWith(
        'rememberMe',
        'true',
        expect.any(Object),
      );
    });
  });
});
