import { Request } from 'express';

export interface UserSession {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  user: UserSession;
}
