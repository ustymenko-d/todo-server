export interface IJwtUser {
  userId: string;
  email: string;
  tokenVersion: number;
  sessionId: string;
}

export interface IResponseStatus {
  success: boolean;
  message: string;
}
