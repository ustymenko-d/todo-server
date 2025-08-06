import { createMockMethods } from 'test/utils/createMockMethods';

export const mockPasswordService = () =>
  createMockMethods(['sendResetPasswordEmail', 'resetPassword'] as const);

export type TPasswordServiceMock = ReturnType<typeof mockPasswordService>;
