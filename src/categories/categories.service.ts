import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Category } from './entities/category.entity';
import { Model } from 'mongoose';
import { CategoryDto } from './dto/category.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class CategoriesService {
  private readonly logger: Logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  /**
   * Create a new category.
   * @param createCategoryDto The data to create the category.
   * @param userId The id of the user to create the category.
   * @returns The category created.
   * @async
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryDto> {
    try {
      const categoryModel = new this.categoryModel(createCategoryDto);
      const savedCategory = await categoryModel.save();
      return plainToClass(CategoryDto, savedCategory.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to create category: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find all categories of a user.
   * @param userId The id of the user to find the categories.
   * @returns The categories found.
   * @async
   */
  async findAll(userId: string): Promise<CategoryDto[]> {
    try {
      const categories = await this.categoryModel.find({ user: userId }).sort({
        createdAt: -1,
      });
      return categories.map((category) =>
        plainToClass(CategoryDto, category.toObject()),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find categories: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the categories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a category by id.
   * @param id The id of the category to find.
   * @param userId The id of the user to find the category.
   * @returns The category found.
   * @async
   */
  async findById(id: string, userId: string): Promise<CategoryDto> {
    try {
      const category = await this.categoryModel.findOne({
        _id: id,
        user: userId,
      });
      if (!category) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(CategoryDto, category.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find category: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a category.
   * @param id The id of the category to update.
   * @param updateCategoryDto The data to update the category.
   * @param userId The id of the user to update the category.
   * @returns The category updated.
   * @async
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ): Promise<CategoryDto> {
    try {
      const updatedCategory = await this.categoryModel.findOneAndUpdate(
        { _id: id, user: userId },
        updateCategoryDto,
        {
          new: true,
        },
      );
      if (!updatedCategory) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(CategoryDto, updatedCategory.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to update category: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error updating the category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove a category.
   * @param id The id of the category to remove.
   * @param userId The id of the user to remove the category.
   * @returns The category removed.
   * @async
   */
  async remove(id: string, userId: string): Promise<CategoryDto> {
    try {
      const deletedCategory = await this.categoryModel.findOneAndDelete({
        _id: id,
        user: userId,
      });
      if (!deletedCategory) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(CategoryDto, deletedCategory.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to remove category: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error removing the category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
