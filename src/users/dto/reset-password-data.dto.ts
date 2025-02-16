import { UserStatus } from '../entities/user-status.enum';

export class ResetPasswordDataDto {
  id: string;
  resetPasswordRetries: number;
  resetPasswordLastSentAt: Date;
  status: UserStatus;
}
