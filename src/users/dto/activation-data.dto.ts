import { UserStatus } from '../entities/user-status.enum';

export class ActivationDataDto {
  id: string;
  activationCode: string;
  hashedActivationCode?: string;
  activationCodeExpires: Date;
  activationCodeResendAt: Date;
  activationCodeRetries: number;
  status: UserStatus;
}
