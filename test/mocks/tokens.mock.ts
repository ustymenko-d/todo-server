import { createMockMethods } from 'test/utils/createMockMethods';

export const mockTokensService = () =>
  createMockMethods([
    'createAccessToken',
    'decodeAccessToken',
    'createRefreshToken',
    'createResetPasswordToken',
    'verifyResetPasswordToken',
    'revokePreviousTokens',
    'refreshTokens',
  ] as const);

export type TTokensServiceMock = ReturnType<typeof mockTokensService>;
