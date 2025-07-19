import {
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
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
  category: string;

  @IsMongoId()
  account: string;
}
