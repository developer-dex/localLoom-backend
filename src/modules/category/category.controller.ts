import { Request, Response } from 'express';
import { CategoryService } from './category.service';
import { ApiResponse, asyncHandler } from '../../common/utils';
import { CATEGORY_MESSAGES } from '../../common/constants';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await this.categoryService.getAllActive();
    ApiResponse.success(res, categories, CATEGORY_MESSAGES.LIST_FETCHED);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const category = await this.categoryService.getById(req.params.id);
    ApiResponse.success(res, category, CATEGORY_MESSAGES.FETCHED);
  });
}
