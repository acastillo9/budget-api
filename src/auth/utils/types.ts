import { UserDto } from 'src/users/dto/user.dto';

export type AuthenticatedRequest = Request & { user: UserDto };

export type JwtPayload = {
  sub: string;
  email: string;
};
