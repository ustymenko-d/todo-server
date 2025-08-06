import { IUser } from 'src/auth/auth.types';
import { IJwtUser } from 'src/common/common.types';
import { createMockMethods } from 'test/utils/createMockMethods';

export const jwtUserMock: IJwtUser = {
  userId: 'user-id',
  email: 'user@email.com',
  sessionId: 'session-id',
  tokenVersion: 1,
};

export const userMock: IUser = {
  id: 'user-id',
  email: 'user@email.com',
  username: 'user',
  createdAt: new Date(),
  isVerified: true,
  password: 'hashed-pass',
  tokenVersion: 1,
  verificationToken: null,
};

export const mockAuthService = () =>
  createMockMethods([
    'signup',
    'resendVerificationEmail',
    'verifyEmail',
    'login',
    'getAccountInfo',
    'logout',
    'deleteUser',
    'findUserBy',
  ] as const);

export type TAuthServiceMock = ReturnType<typeof mockAuthService>;
