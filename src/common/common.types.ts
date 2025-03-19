export interface IJwtUser {
  userId: string;
  email: string;
  tokenVersion: number;
}

export interface IResponseStatus {
  success: boolean;
  message: string;
}
