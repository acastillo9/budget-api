export class ActivationDataDto {
  id?: string;
  name?: string;
  email?: string;
  activationCode: string;
  hashedActivationCode?: string;
  activationCodeExpires: Date;
  activationCodeResendAt: Date;
  activationCodeRetries: number;
}
