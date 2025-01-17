export interface IUser {
  id: string;
  username: string;
  email: string;
  password: string;
  tokenVersion: number;
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IRefreshToken {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  userId: string;
  refreshToken: string;
}
