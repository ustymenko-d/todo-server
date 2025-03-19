export interface AuthBase {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  tokenVersion: number;
  isVerified: boolean;
  verificationToken: string | null;
  createdAt: Date;
}
