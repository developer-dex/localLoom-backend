import { Request, Response } from 'express';
import { RegionService } from './region.service';
import { ApiResponse, asyncHandler } from '../../common/utils';
import { REGION_MESSAGES } from '../../common/constants';

export class RegionController {
  private regionService: RegionService;

  constructor() {
    this.regionService = new RegionService();
  }

  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const regions = await this.regionService.getAllActive();
    ApiResponse.success(res, regions, REGION_MESSAGES.LIST_FETCHED);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const region = await this.regionService.getById(req.params.id);
    ApiResponse.success(res, region, REGION_MESSAGES.FETCHED);
  });
}
