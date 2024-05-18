import { CategoryDocument } from '../entities/category.entity';

export default class CategoryResponseDto {
  id: string;
  name: string;

  static fromCategory(category: CategoryDocument): CategoryResponseDto {
    const categoryResponseDto = new CategoryResponseDto();
    categoryResponseDto.id = category._id.toHexString();
    categoryResponseDto.name = category.name;
    return categoryResponseDto;
  }
}
