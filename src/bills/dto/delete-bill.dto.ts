import { IsBoolean, IsOptional } from 'class-validator';

export class DeleteBillDto {
  @IsBoolean()
  @IsOptional()
  applyToFuture?: boolean;
}
