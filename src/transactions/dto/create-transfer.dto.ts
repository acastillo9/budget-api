import { Type } from 'class-transformer';
import {
  IsNumber,
  IsDate,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsMongoId,
} from 'class-validator';

export class CreateTransferDto {
  @IsNumber()
  amount: number;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  notes: string;

  @IsMongoId()
  account: string;

  @IsMongoId()
  originAccount: string;
}
