import { Request, Response } from 'express';
import { FavouriteService } from './favourite.service';
import { ApiResponse, asyncHandler, parsePaginationQuery } from '../../common/utils';
import { AuthenticatedRequest } from '../../common/interfaces';
import { FAVOURITE_MESSAGES } from '../../common/constants';
import { AddFavouriteDto } from './favourite.interface';
import { TradieProfile } from '../../models';
import { env } from '../../config/env';

export class FavouriteController {
  private service: FavouriteService;

  constructor() {
    this.service = new FavouriteService();
  }

  add = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const dto: AddFavouriteDto = req.body;
    const favourite = await this.service.addFavourite(userId, dto.tradieProfileId);
    ApiResponse.created(res, favourite, FAVOURITE_MESSAGES.ADDED);
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { tradieProfileId } = req.params;
    await this.service.removeFavourite(userId, tradieProfileId);
    ApiResponse.success(res, null, FAVOURITE_MESSAGES.REMOVED);
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page, limit } = parsePaginationQuery(req.query);
    const result = await this.service.listFavourites(userId, page, limit);

    const data = result.data.map((profile) => {
      const tradieProfileWithExtras = profile as TradieProfile & {
        favouritedAt: Date;
        averageRating: number;
        totalRatingCount: number;
        services?: { id: string; name: string }[];
        serviceRegions?: { id: string; name: string }[];
        user?: { id: string; name: string; avatar: string | null };
      };

      return {
        id: profile.id,
        businessName: profile.businessName,
        businessImage: profile.businessImages?.[0]
          ? `${env.backendBaseUrl}${profile.businessImages[0]}`
          : null,
        services: tradieProfileWithExtras.services?.map((s) => ({ id: s.id, name: s.name })) ?? [],
        regions:
          tradieProfileWithExtras.serviceRegions?.map((r) => ({ id: r.id, name: r.name })) ?? [],
        timeFrom: profile.timeFrom,
        timeTo: profile.timeTo,
        openDays: profile.openDays ?? [],
        isEmergencyAvailable: profile.isEmergencyAvailable,
        averageRating: tradieProfileWithExtras.averageRating,
        totalRatingCount: tradieProfileWithExtras.totalRatingCount,
        favouritedAt: tradieProfileWithExtras.favouritedAt,
      };
    });

    ApiResponse.paginated(res, data, result.meta, FAVOURITE_MESSAGES.LIST_FETCHED);
  });
}
