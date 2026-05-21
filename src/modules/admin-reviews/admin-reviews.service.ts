import { AdminReviewsRepository, ReviewListOptions } from './admin-reviews.repository';
import { Review } from '../../models';
import { NotFoundException } from '../../common/exceptions';
import { PaginatedResult } from '../../common/interfaces';
import { REVIEW_MESSAGES } from '../../common/constants';

export interface BulkActionResult {
  processed: number;
  failed: number;
}

export class AdminReviewsService {
  private repo: AdminReviewsRepository;

  constructor() {
    this.repo = new AdminReviewsRepository();
  }

  async list(options: ReviewListOptions): Promise<PaginatedResult<Review>> {
    return this.repo.findAll(options);
  }

  async getById(id: string): Promise<Review> {
    const review = await this.repo.findById(id);
    if (!review) {
      throw new NotFoundException(REVIEW_MESSAGES.NOT_FOUND);
    }
    return review;
  }

  async approve(id: string, adminId: string): Promise<Review> {
    const review = await this.repo.updateStatus(id, {
      status: 'approved',
      rejectionReason: null,
      reviewedByAdmin: adminId,
      reviewedAt: new Date(),
    });
    if (!review) {
      throw new NotFoundException(REVIEW_MESSAGES.NOT_FOUND);
    }
    return review;
  }

  async reject(id: string, rejectionReason: string, adminId: string): Promise<Review> {
    const review = await this.repo.updateStatus(id, {
      status: 'rejected',
      rejectionReason,
      reviewedByAdmin: adminId,
      reviewedAt: new Date(),
    });
    if (!review) {
      throw new NotFoundException(REVIEW_MESSAGES.NOT_FOUND);
    }
    return review;
  }

  async bulkApprove(ids: string[], adminId: string): Promise<BulkActionResult> {
    let processed = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const review = await this.repo.updateStatus(id, {
          status: 'approved',
          rejectionReason: null,
          reviewedByAdmin: adminId,
          reviewedAt: new Date(),
        });
        if (review) {
          processed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { processed, failed };
  }

  async bulkReject(ids: string[], rejectionReason: string, adminId: string): Promise<BulkActionResult> {
    let processed = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const review = await this.repo.updateStatus(id, {
          status: 'rejected',
          rejectionReason,
          reviewedByAdmin: adminId,
          reviewedAt: new Date(),
        });
        if (review) {
          processed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { processed, failed };
  }
}
