import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ActivationDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  activationCode: string;
}
