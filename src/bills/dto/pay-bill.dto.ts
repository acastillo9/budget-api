import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class PayBillDto {
  @IsDate()
  @Type(() => Date)
  paidDate: Date;
}
