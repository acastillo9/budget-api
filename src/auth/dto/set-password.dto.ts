import { Matches, MaxLength, MinLength } from 'class-validator';

export class SetPasswordDto {
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(250)
  @Matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;
}
