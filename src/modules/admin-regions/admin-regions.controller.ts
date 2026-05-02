import { Request, Response } from 'express';
import { AdminRegionsService } from './admin-regions.service';
import { ApiResponse, asyncHandler } from '../../common/utils';
import { REGION_MESSAGES } from '../../common/constants';
import { CreateRegionDto, UpdateRegionDto } from './admin-regions.interface';

export class AdminRegionsController {
  private service: AdminRegionsService;

  constructor() {
    this.service = new AdminRegionsService();
  }

  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const regions = await this.service.getAll();
    ApiResponse.success(res, regions, REGION_MESSAGES.LIST_FETCHED);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const dto: CreateRegionDto = req.body;
    const region = await this.service.create(dto);
    ApiResponse.created(res, region, REGION_MESSAGES.CREATED);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const dto: UpdateRegionDto = req.body;
    const region = await this.service.update(req.params.id, dto);
    ApiResponse.success(res, region, REGION_MESSAGES.UPDATED);
  });

  softDelete = asyncHandler(async (req: Request, res: Response) => {
    await this.service.softDelete(req.params.id);
    ApiResponse.success(res, null, REGION_MESSAGES.DELETED);
  });
}
