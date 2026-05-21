import { Request, Response } from 'express';
import { AdminCategoriesService } from './admin-categories.service';
import { ApiResponse, asyncHandler } from '../../common/utils';
import { CATEGORY_MESSAGES } from '../../common/constants';
import { UpdateCategoryDto } from './admin-categories.interface';
import { getFileUrl } from '../../services/file-upload.service';
import { env } from '../../config/env';

export class AdminCategoriesController {
  private service: AdminCategoriesService;

  constructor() {
    this.service = new AdminCategoriesService();
  }

  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await this.service.getAll();
    const data = categories.map((cat) => ({
      ...cat.toJSON(),
      icon: cat.icon ? `${env.backendBaseUrl}${cat.icon}` : null,
    }));
    ApiResponse.success(res, data, CATEGORY_MESSAGES.LIST_FETCHED);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, sortOrder } = req.body;
    const icon = req.file ? getFileUrl('category', req.file.filename) : undefined;

    const category = await this.service.create({ name, description, sortOrder: sortOrder ? Number(sortOrder) : undefined, icon });
    ApiResponse.created(res, category, CATEGORY_MESSAGES.CREATED);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const dto: UpdateCategoryDto = { ...req.body };

    // If a new icon file is uploaded, use it
    if (req.file) {
      dto.icon = getFileUrl('category', req.file.filename);
    }

    // Convert sortOrder to number if present
    if (dto.sortOrder !== undefined) {
      dto.sortOrder = Number(dto.sortOrder);
    }

    // Convert isActive string to boolean if present (multipart sends strings)
    if (typeof dto.isActive === 'string') {
      dto.isActive = dto.isActive === 'true';
    }

    const category = await this.service.update(req.params.id, dto);
    ApiResponse.success(res, category, CATEGORY_MESSAGES.UPDATED);
  });

  softDelete = asyncHandler(async (req: Request, res: Response) => {
    await this.service.softDelete(req.params.id);
    ApiResponse.success(res, null, CATEGORY_MESSAGES.DELETED);
  });
}
