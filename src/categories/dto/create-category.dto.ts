import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CategoryType } from '../entities/category-type.enum';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  icon: string;

  @IsEnum(CategoryType)
  categoryType: string;
}
