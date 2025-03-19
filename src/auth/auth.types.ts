export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IUser {
  id: string;
  email: string;
  username: string;
  tokenVersion: number;
  createdAt: Date;
  isVerified: boolean;
  verificationToken: string | null;
}
