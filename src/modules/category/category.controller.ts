import { Request, Response } from 'express';
import { CategoryService } from './category.service';
import { ApiResponse, asyncHandler } from '../../common/utils';
import { CATEGORY_MESSAGES } from '../../common/constants';
import { env } from '../../config/env';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await this.categoryService.getAllActive();
    const data = categories.map((cat) => ({
      ...cat.toJSON(),
      icon: cat.icon ? `${env.backendBaseUrl}${cat.icon}` : null,
    }));
    ApiResponse.success(res, data, CATEGORY_MESSAGES.LIST_FETCHED);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const category = await this.categoryService.getById(req.params.id);
    const data = {
      ...category.toJSON(),
      icon: category.icon ? `${env.backendBaseUrl}${category.icon}` : null,
    };
    ApiResponse.success(res, data, CATEGORY_MESSAGES.FETCHED);
  });
}
