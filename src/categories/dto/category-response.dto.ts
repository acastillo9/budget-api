import { CategoryDocument } from '../entities/category.entity';

export default class CategoryResponseDto {
  id: string;
  name: string;

  static fromCategory(category: CategoryDocument): CategoryResponseDto {
    const sourceResponseDTO = new CategoryResponseDto();
    sourceResponseDTO.id = category._id.toHexString();
    sourceResponseDTO.name = category.name;
    return sourceResponseDTO;
  }
}
