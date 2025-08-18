export interface JwtPayload {
  sub: string;
  userId: string;
}

export interface Credentials {
  access_token: string;
  refresh_token?: string;
}

export interface GoogleAuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    displayName: string;
    picture: string;
    accessToken: string;
    refreshToken: string;
    locale: string;
  };
}
