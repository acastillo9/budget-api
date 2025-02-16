import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import CategoryDto from './dto/category.dto';
import { AuthenticatedRequest } from 'src/core/types';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Create a new category.
   * @param req The request object.
   * @param createCategoryDto The data to create the category.
   * @returns The category created.
   * @async
   */
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoriesService.create(createCategoryDto, req.user.id);
  }

  /**
   * Find all categories of a user.
   * @param req The request object.
   * @returns The categories found.
   * @async
   */
  @Get()
  findAll(@Request() req: AuthenticatedRequest): Promise<CategoryDto[]> {
    return this.categoriesService.findAll(req.user.id);
  }

  /**
   * Find a category by id.
   * @param req The request object.
   * @param id The id of the category to find.
   * @returns The category found.
   * @async
   */
  @Get(':id')
  findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<CategoryDto> {
    return this.categoriesService.findOne(id, req.user.id);
  }

  /**
   * Update a category by id.
   * @param req The request object.
   * @param id The id of the category to update.
   * @param updateCategoryDto The data to update the category.
   * @returns The category updated.
   * @async
   */
  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoriesService.update(id, updateCategoryDto, req.user.id);
  }

  /**
   * Remove a category by id.
   * @param req The request object.
   * @param id The id of the category to remove.
   * @returns The category removed.
   * @async
   */
  @Delete(':id')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<CategoryDto> {
    return this.categoriesService.remove(id, req.user.id);
  }
}
