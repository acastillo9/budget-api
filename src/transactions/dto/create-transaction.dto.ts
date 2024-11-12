import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransactionType } from '../entities/transaction-type.enum';
import { RepeatType } from '../entities/repeat-type.enum';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  transactionType: string;

  @IsNumber()
  amount: number;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsDate()
  endDate: Date;

  @IsOptional()
  @IsEnum(RepeatType)
  repeatType: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsMongoId()
  category: string;

  @IsOptional()
  @IsBoolean()
  paid: boolean;

  @IsMongoId()
  account: string;
}
