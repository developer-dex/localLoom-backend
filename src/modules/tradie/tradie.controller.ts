import { Request, Response } from 'express';
import { TradieService } from './tradie.service';
import { ApiResponse, asyncHandler, parsePaginationQuery } from '../../common/utils';
import { AuthenticatedRequest } from '../../common/interfaces';
import { TRADIE_MESSAGES } from '../../common/constants';
import { SetupTradieProfileDto } from './tradie.interface';
import { getFileUrl } from '../../services/file-upload.service';
import { logger } from '../../common/utils/logger';

export class TradieController {
  private tradieService: TradieService;

  constructor() {
    this.tradieService = new TradieService();
  }

  // ── Public ──

  list = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user?.userId;
    const result = await this.tradieService.listTradies(req.query, userId);
    ApiResponse.paginated(res, result.data, result.meta, TRADIE_MESSAGES.LIST_FETCHED);
  });

  getPublic = asyncHandler(async (req: Request, res: Response) => {
    const profile = await this.tradieService.getPublicProfile(req.params.id);
    await this.tradieService.recordVisit(profile.id, undefined, req.ip);
    ApiResponse.success(res, profile, TRADIE_MESSAGES.PROFILE_FETCHED);
  });

  getDetails = asyncHandler(async (req: Request, res: Response) => {
    const { type, page, limit } = req.query as { type: string; page?: string; limit?: string };
    const result = await this.tradieService.getTradieDetails(
      req.params.id,
      type,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    ApiResponse.success(res, result, 'Details fetched');
  });

  getContact = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const profile = await this.tradieService.getPublicProfileWithContact(req.params.id);
    await this.tradieService.recordContact(userId, profile.id);
    await this.tradieService.recordVisit(profile.id, userId, req.ip);
    ApiResponse.success(res, profile, TRADIE_MESSAGES.PROFILE_FETCHED);
  });

  getReviews = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationQuery(req.query);
    const result = await this.tradieService.getApprovedReviews(req.params.id, page, limit);
    ApiResponse.paginated(res, result.data, result.meta, 'Reviews fetched');
  });

  getWorkPhotos = asyncHandler(async (req: Request, res: Response) => {
    const photos = await this.tradieService.getWorkPhotos(req.params.id);
    ApiResponse.success(res, photos, 'Work photos fetched');
  });

  // ── Tradie self-management ──

  getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const profile = await this.tradieService.getMyProfile(userId);
    ApiResponse.success(res, profile, TRADIE_MESSAGES.PROFILE_FETCHED);
  });

  setupProfile = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      const dto: SetupTradieProfileDto = {
        ...req.body,
        businessImageUrl: files?.businessImage?.[0]
          ? getFileUrl('businessDetails', files.businessImage[0].filename)
          : undefined,
        businessVideoUrl: files?.businessVideo?.[0]
          ? getFileUrl('businessDetails', files.businessVideo[0].filename)
          : undefined,
      };

      const profile = await this.tradieService.setupProfile(userId, role, dto);
      ApiResponse.success(res, profile, 'Profile saved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`setupProfile failed: ${msg}`, { error });
      throw error;
    }
  });

  addWorkPhotos = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return ApiResponse.error(res, 'At least one image is required', 400);
    const imageUrls = files.map((f) => getFileUrl('workImage', f.filename));
    const photos = await this.tradieService.addWorkPhotos(userId, imageUrls);
    ApiResponse.created(res, photos, TRADIE_MESSAGES.PHOTO_UPLOADED);
  });

  deleteWorkPhoto = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    await this.tradieService.deleteWorkPhoto(userId, req.params.photoId);
    ApiResponse.success(res, null, TRADIE_MESSAGES.PHOTO_DELETED);
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const stats = await this.tradieService.getStats(userId);
    ApiResponse.success(res, stats, TRADIE_MESSAGES.STATS_FETCHED);
  });

  abnLookup = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.tradieService.abnLookup(req.body.abn);
    ApiResponse.success(res, result, 'ABN lookup successful');
  });
}
