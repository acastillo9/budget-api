export class ActivationDataDto {
  id?: string;
  name?: string;
  email?: string;
  activationCode: string;
  hashedActivationCode?: string;
  activationCodeExpiresAt: Date;
  activationCodeResendAt: Date;
  activationCodeRetries: number;
}
