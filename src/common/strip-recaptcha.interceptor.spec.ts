import { CallHandler, ExecutionContext } from '@nestjs/common';
import { StripRecaptchaInterceptor } from './strip-recaptcha.interceptor';
import { of } from 'rxjs';

describe('StripRecaptchaInterceptor', () => {
  let interceptor: StripRecaptchaInterceptor;
  let context: ExecutionContext;
  let callHandler: CallHandler;

  beforeEach(() => {
    interceptor = new StripRecaptchaInterceptor();
    callHandler = { handle: () => of({ success: true }) } as CallHandler;
  });

  function createContext(body: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: <T = any>() => ({ body }) as any as T,
      }),
    } as unknown as ExecutionContext;
  }

  it('removes recaptchaToken if present', (done) => {
    const body = { recaptchaToken: 'token', foo: 'bar' };
    context = createContext(body);

    interceptor.intercept(context, callHandler).subscribe((data) => {
      expect(body).not.toHaveProperty('recaptchaToken');
      expect(data).toEqual({ success: true });
      done();
    });
  });

  it('leaves body unchanged if recaptchaToken absent', (done) => {
    const body = { foo: 'bar' };
    context = createContext(body);

    interceptor.intercept(context, callHandler).subscribe((data) => {
      expect(body).toEqual({ foo: 'bar' });
      expect(data).toEqual({ success: true });
      done();
    });
  });
});
