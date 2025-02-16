export interface JwtPayload {
  sub: string;
}

export interface Session {
  access_token: string;
}

export interface GoogleAuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    displayName: string;
    picture: string;
    accessToken: string;
    refreshToken: string;
  };
}
