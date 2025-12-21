import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { BillFrequency } from '../entities/bill-frequency.enum';

export class CreateBillDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsEnum(BillFrequency)
  frequency: BillFrequency;

  @IsMongoId()
  account: string;

  @IsMongoId()
  category: string;
}
