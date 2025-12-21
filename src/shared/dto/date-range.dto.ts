import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class DateRangeDto {
  @IsDate()
  @Type(() => Date)
  dateStart: Date;

  @IsDate()
  @Type(() => Date)
  dateEnd: Date;
}
