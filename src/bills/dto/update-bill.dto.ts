import { PartialType } from '@nestjs/mapped-types';
import { CreateBillDto } from './create-bill.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateBillDto extends PartialType(CreateBillDto) {
  @IsBoolean()
  @IsOptional()
  applyToFuture?: boolean;
}
