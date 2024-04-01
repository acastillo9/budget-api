import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Category } from './entities/category.entity';
import { Model } from 'mongoose';
import CategoryResponseDto from './dto/category-response.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async create(
    createSourceDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return new this.categoryModel(createSourceDto)
      .save()
      .then(CategoryResponseDto.fromCategory);
  }

  async findAll(): Promise<CategoryResponseDto[]> {
    return this.categoryModel
      .find()
      .exec()
      .then((sources) => sources.map(CategoryResponseDto.fromCategory));
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    return this.categoryModel
      .findById(id)
      .exec()
      .then(CategoryResponseDto.fromCategory);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoryModel
      .findByIdAndUpdate(id, updateCategoryDto)
      .exec()
      .then(CategoryResponseDto.fromCategory);
  }

  async remove(id: string): Promise<CategoryResponseDto> {
    return this.categoryModel
      .findByIdAndDelete(id)
      .exec()
      .then(CategoryResponseDto.fromCategory);
  }
}
