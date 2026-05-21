import { TradieRepository } from './tradie.repository';
import { SetupTradieProfileDto, TradieFilterQuery } from './tradie.interface';
import { TradieProfile, TradieWorkPhoto, Review, ProfileVisit, ContactLog, Category, Region } from '../../models';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '../../common/exceptions';
import { TRADIE_MESSAGES } from '../../common/constants';
import { PaginatedResult } from '../../common/interfaces';
import { AbnLookupService, AbnLookupResult } from '../../services/abn-lookup.service';
import { UserRole } from '../../common/enums';
import { Op } from 'sequelize';
import { env } from '../../config/env';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function computeIsOpen(profile: TradieProfile): boolean {
  const { openDays, timeFrom, timeTo } = profile;
  if (!openDays || !timeFrom || !timeTo) return false;

  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  if (!openDays.includes(todayName)) return false;

  const [fromH, fromM] = timeFrom.split(':').map(Number);
  const [toH, toM] = timeTo.split(':').map(Number);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const fromMins = fromH * 60 + fromM;
  const toMins = toH * 60 + toM;

  return currentMins >= fromMins && currentMins < toMins;
}

export class TradieService {
  private repo: TradieRepository;
  private abnService: AbnLookupService;

  constructor() {
    this.repo = new TradieRepository();
    this.abnService = new AbnLookupService();
  }

  // ── Public ──

  async listTradies(filters: TradieFilterQuery, userId?: string): Promise<PaginatedResult<object>> {
    const where: Record<string, unknown> = {};
    if (filters.availability === 'true') where.isAvailable = true;
    if (filters.emergency === 'true') where.isEmergencyAvailable = true;

    const pagination = {
      page: filters.page || 1,
      limit: filters.limit || 20,
      sort: 'createdAt',
      order: 'desc' as const,
    };

    const result = await this.repo.findAllApproved(where, pagination, filters.categoryId, filters.regionId, userId);

    const data = result.data.map((profile) => ({
      id: profile.id,
      businessName: profile.businessName,
      businessImage: profile.businessImages?.[0] ? `${env.backendBaseUrl}${profile.businessImages[0]}` : null,
      services: (profile as TradieProfile & { services?: { id: string; name: string }[] }).services?.map((s) => ({ id: s.id, name: s.name })) ?? [],
      regions: (profile as TradieProfile & { serviceRegions?: { id: string; name: string }[] }).serviceRegions?.map((r) => ({ id: r.id, name: r.name })) ?? [],
      isOpen: computeIsOpen(profile),
      openDays: profile.openDays ?? [],
      timeFrom: profile.timeFrom,
      timeTo: profile.timeTo,
      averageRating: (profile as TradieProfile & { averageRating: number }).averageRating,
      totalRatingCount: (profile as TradieProfile & { totalRatingCount: number }).totalRatingCount,
      isFavourite: (profile as TradieProfile & { isFavourite: boolean }).isFavourite,
    }));

    return { data, meta: result.meta };
  }

  async getPublicProfile(id: string): Promise<TradieProfile> {
    const profile = await this.repo.findByIdPublic(id);
    if (!profile) throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);
    return profile;
  }

  async getTradieDetails(id: string, type: string, page = 1, limit = 20): Promise<object> {
    const profile = await this.repo.findByIdPublic(id);
    if (!profile) throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);

    if (type === 'about') {
      const user = profile.user;
      return {
        id: profile.id,
        businessName: profile.businessName,
        serviceDescription: profile.serviceDescription,
        services: profile.services?.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })) ?? [],
        profileImage: user?.avatar ?? profile.profilePhoto ?? null,
        tradieName: user?.name ?? null,
        contactNumber: user?.phone ?? null,
        email: user?.email ?? null,
        website: profile.website,
        location: profile.businessLocation,
        timeFrom: profile.timeFrom,
        timeTo: profile.timeTo,
        openDays: profile.openDays ?? [],
        isOpen: computeIsOpen(profile),
        isEmergencyAvailable: profile.isEmergencyAvailable,
      };
    }

    if (type === 'work') {
      const photos = await this.repo.getWorkPhotos(profile.id);
      return {
        images: photos.map((p) => ({ id: p.id, imageUrl: p.imageUrl, sortOrder: p.sortOrder })),
      };
    }

    // type === 'reviews'
    const result = await this.repo.getApprovedReviews(profile.id, page, limit);
    const ratings = result.data.map((r) => r.rating);
    const totalReviewCount = result.meta.total;
    const averageRating = totalReviewCount > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 100) / 100
      : 0;

    // For accurate average across all reviews (not just current page), compute from DB
    const allReviews = await Review.findAll({
      where: { tradieProfileId: profile.id, status: 'approved' },
      attributes: ['rating'],
      raw: true,
    });
    const totalAvg = allReviews.length > 0
      ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 100) / 100
      : 0;

    return {
      totalReviewCount: allReviews.length,
      averageRating: totalAvg,
      reviews: result.data.map((r) => ({
        id: r.id,
        giverName: r.customer?.name ?? null,
        profileImage: r.customer?.avatar ?? null,
        time: r.createdAt,
        rating: r.rating,
        comment: r.comment,
      })),
      meta: result.meta,
    };
  }

  async getPublicProfileWithContact(id: string): Promise<TradieProfile> {
    const profile = await this.repo.findByIdPublicWithContact(id);
    if (!profile) throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);
    return profile;
  }

  async getApprovedReviews(tradieProfileId: string, page: number, limit: number): Promise<PaginatedResult<Review>> {
    return this.repo.getApprovedReviews(tradieProfileId, page, limit);
  }

  async getWorkPhotos(tradieProfileId: string): Promise<TradieWorkPhoto[]> {
    return this.repo.getWorkPhotos(tradieProfileId);
  }

  async recordVisit(tradieProfileId: string, visitorId?: string, ipAddress?: string): Promise<void> {
    await ProfileVisit.create({ tradieProfileId, visitorId, ipAddress });
  }

  async recordContact(customerId: string, tradieProfileId: string): Promise<void> {
    const existing = await ContactLog.findOne({ where: { customerId, tradieProfileId } });
    if (!existing) {
      const contactedAt = new Date();
      const reviewEligibleAt = new Date(contactedAt.getTime() + 7 * 60 * 60 * 1000);
      await ContactLog.create({ customerId, tradieProfileId, contactedAt, reviewEligibleAt });
    }
  }

  // ── Tradie self-management ──

  async getMyProfile(userId: string): Promise<TradieProfile> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);
    return profile;
  }

  /**
   * Single setup endpoint — create or update the tradie profile with all fields at once.
   */
  async setupProfile(userId: string, userRole: string, dto: SetupTradieProfileDto): Promise<TradieProfile> {
    if (userRole !== UserRole.TRADIE) {
      throw new ForbiddenException('Only tradies can set up a profile');
    }

    // Normalise array fields that may arrive as a single string from multipart
    const categoryIds = Array.isArray(dto.categoryIds) ? dto.categoryIds : [dto.categoryIds];
    const regionIds = Array.isArray(dto.regionIds) ? dto.regionIds : [dto.regionIds];
    const openDays = dto.openDays
      ? Array.isArray(dto.openDays) ? dto.openDays : [dto.openDays]
      : undefined;

    if (categoryIds.length > 6) throw new BadRequestException(TRADIE_MESSAGES.MAX_SERVICES);

    // Validate that all categoryIds exist in the DB
    const validCategoryCount = await Category.count({ where: { id: { [Op.in]: categoryIds } } });
    if (validCategoryCount !== categoryIds.length) {
      const validCategories = await Category.findAll({ where: { id: { [Op.in]: categoryIds } }, attributes: ['id'], raw: true });
      const validSet = new Set(validCategories.map((c) => c.id));
      const invalid = categoryIds.filter((id) => !validSet.has(id));
      throw new BadRequestException(`Invalid category IDs: ${invalid.join(', ')}`);
    }

    // Validate that all regionIds exist in the DB
    const validRegionCount = await Region.count({ where: { id: { [Op.in]: regionIds } } });
    if (validRegionCount !== regionIds.length) {
      const validRegions = await Region.findAll({ where: { id: { [Op.in]: regionIds } }, attributes: ['id'], raw: true });
      const validSet = new Set(validRegions.map((r) => r.id));
      const invalid = regionIds.filter((id) => !validSet.has(id));
      throw new BadRequestException(`Invalid region IDs: ${invalid.join(', ')}`);
    }

    // Parse abnData if it arrived as a JSON string
    let abnData = dto.abnData;
    if (typeof abnData === 'string') {
      try { abnData = JSON.parse(abnData); } catch { abnData = undefined; }
    }

    const existing = await this.repo.findByUserId(userId);

    if (!existing) {
      // Create
      const profile = await this.repo.create({
        userId,
        abn: dto.abn,
        abnData,
        businessName: dto.businessName,
        serviceDescription: dto.serviceDescription,
        website: dto.website,
        timeFrom: dto.timeFrom,
        timeTo: dto.timeTo,
        openDays,
        isEmergencyAvailable: dto.isEmergencyAvailable ?? false,
        introVideoUrl: dto.businessVideoUrl,
        businessImages: dto.businessImageUrl ? [dto.businessImageUrl] : [],
        yearsOfExperience: 0,
        termsAcceptedAt: new Date(),
      });
      await this.repo.setServices(profile.id, categoryIds);
      await this.repo.setRegions(profile.id, regionIds);
    } else {
      // Update
      const updateData: Record<string, unknown> = {
        abn: dto.abn,
        abnData,
        businessName: dto.businessName,
        serviceDescription: dto.serviceDescription,
        website: dto.website,
        timeFrom: dto.timeFrom,
        timeTo: dto.timeTo,
        openDays,
        isEmergencyAvailable: dto.isEmergencyAvailable ?? existing.isEmergencyAvailable,
      };
      if (dto.businessVideoUrl) updateData.introVideoUrl = dto.businessVideoUrl;
      if (dto.businessImageUrl) {
        const current = existing.businessImages || [];
        updateData.businessImages = [...current, dto.businessImageUrl];
      }
      await this.repo.update(existing.id, updateData);
      await this.repo.setServices(existing.id, categoryIds);
      await this.repo.setRegions(existing.id, regionIds);
    }

    return (await this.repo.findByUserId(userId))!;
  }

  async addWorkPhotos(userId: string, imageUrls: string[]): Promise<TradieWorkPhoto[]> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);

    const count = await this.repo.countWorkPhotos(profile.id);
    if (count + imageUrls.length > 20) throw new BadRequestException(TRADIE_MESSAGES.MAX_PHOTOS);

    const photos: TradieWorkPhoto[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const photo = await this.repo.createWorkPhoto({
        tradieProfileId: profile.id,
        imageUrl: imageUrls[i],
        sortOrder: count + i + 1,
      });
      photos.push(photo);
    }
    return photos;
  }

  async deleteWorkPhoto(userId: string, photoId: string): Promise<void> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);

    const deleted = await this.repo.deleteWorkPhoto(photoId, profile.id);
    if (!deleted) throw new NotFoundException('Work photo not found');
  }

  async getStats(userId: string): Promise<{ visitCount: number; reviewCount: number; averageRating: number }> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);

    const visitCount = await ProfileVisit.count({ where: { tradieProfileId: profile.id } });
    const reviews = await Review.findAll({ where: { tradieProfileId: profile.id, status: 'approved' }, attributes: ['rating'] });
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;

    return { visitCount, reviewCount, averageRating: Math.round(averageRating * 100) / 100 };
  }

  async abnLookup(abn: string): Promise<AbnLookupResult> {
    return this.abnService.lookup(abn);
  }
}
