import { IResponseStatus } from 'src/common/common.types';

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IUserInfo {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  isVerified: boolean;
}

export interface IUser extends IUserInfo {
  password: string;
  tokenVersion: number;
  verificationToken: string | null;
}

export interface IAuthData extends ITokenPair {
  userInfo: IUserInfo;
}

export interface IAuthResponse extends IResponseStatus {
  userInfo: IUserInfo;
}

export type TFindUserByQuery =
  | { id: string; tokenVersion?: number }
  | { email: string }
  | { verificationToken: string };
