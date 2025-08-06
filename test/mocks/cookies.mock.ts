import { createMockMethods } from 'test/utils/createMockMethods';
import { Response } from 'express';

export const mockCookiesService = () =>
  createMockMethods(['setAuthCookies', 'clearAuthCookies'] as const);

export type TCookiesServiceMock = ReturnType<typeof mockCookiesService>;

export const createResponseMock = () => {
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  return { cookie, clearCookie } as unknown as Response;
};
