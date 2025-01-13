export class ResetPasswordDataDto {
  id: string;
  resetPasswordRetries: number;
  resetPasswordLastSentAt: Date;
  status: string;
}
