export interface AuthRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  userId: string;
  refreshToken: string;
}
