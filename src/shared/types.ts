import { Request } from 'express';

export interface Session {
  authId: string;
  userId: string;
  name?: string;
  email?: string;
  picture?: string;
  currencyCode?: string;
  refreshToken?: string;
  isLongLived?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: Session;
}
