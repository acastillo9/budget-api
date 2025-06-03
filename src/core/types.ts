import { Request } from 'express';

export interface Session {
  id: string;
  name?: string;
  refreshToken?: string;
  isLongLived?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: Session;
}
