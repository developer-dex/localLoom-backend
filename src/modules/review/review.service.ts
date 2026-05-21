import { ReviewRepository } from './review.repository';
import { CreateReviewDto } from './review.interface';
import { Review, TradieProfile, ContactLog } from '../../models';
import { PaginatedResult } from '../../common/interfaces';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '../../common/exceptions';
import { REVIEW_MESSAGES, TRADIE_MESSAGES } from '../../common/constants';

export class ReviewService {
  private reviewRepository: ReviewRepository;

  constructor() {
    this.reviewRepository = new ReviewRepository();
  }

  async createReview(customerId: string, userRole: string, dto: CreateReviewDto): Promise<Review> {
    // Only customers can submit reviews
    if (userRole !== 'customer') {
      throw new ForbiddenException('Only customers can submit reviews');
    }

    // Validate tradie profile exists and is approved
    const tradieProfile = await TradieProfile.findOne({
      where: { id: dto.tradieProfileId, profileStatus: 'approved' },
    });
    if (!tradieProfile) {
      throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);
    }

    // // Check contact eligibility
    // const contactLog = await ContactLog.findOne({
    //   where: { customerId, tradieProfileId: dto.tradieProfileId },
    // });
    // if (!contactLog) {
    //   throw new ForbiddenException('You can only review tradies you have contacted');
    // }

    // // Check review eligibility time
    // if (new Date() < contactLog.reviewEligibleAt) {
    //   throw new ForbiddenException('You are not yet eligible to review this tradie');
    // }

    // Check for duplicate review
    const existing = await this.reviewRepository.findByCustomerAndTradie(customerId, dto.tradieProfileId);
    if (existing) {
      throw new ConflictException(REVIEW_MESSAGES.ALREADY_REVIEWED);
    }

    // Create review with pending status
    return this.reviewRepository.create({
      customerId,
      tradieProfileId: dto.tradieProfileId,
      rating: dto.rating,
      comment: dto.comment || null,
      status: 'pending',
    });
  }

  async getMyReviews(customerId: string, page: number, limit: number): Promise<PaginatedResult<Review>> {
    return this.reviewRepository.findMyReviews(customerId, page, limit);
  }
}
