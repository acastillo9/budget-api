import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class TransactionsQueryDto {
  @IsMongoId()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  month?: number;

  @IsString()
  @IsOptional()
  year?: number;
}
