import { AdminTradiesRepository, TradieListOptions } from './admin-tradies.repository';
import { TradieProfile } from '../../models';
import { NotFoundException } from '../../common/exceptions';
import { PaginatedResult } from '../../common/interfaces';
import { TRADIE_MESSAGES } from '../../common/constants';
import { serializeTradieProfile } from './admin-tradies.serializer';

export interface BulkActionResult {
  processed: number;
  failed: number;
}

export class AdminTradiesService {
  private repo: AdminTradiesRepository;

  constructor() {
    this.repo = new AdminTradiesRepository();
  }

  async list(options: TradieListOptions): Promise<PaginatedResult<Record<string, unknown>>> {
    const result = await this.repo.findAll(options);
    return {
      data: result.data.map(serializeTradieProfile),
      meta: result.meta,
    };
  }

  async getById(id: string): Promise<Record<string, unknown>> {
    const profile = await this.repo.findById(id);
    if (!profile) {
      throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);
    }
    return serializeTradieProfile(profile);
  }

  async approve(id: string): Promise<TradieProfile> {
    const profile = await this.repo.updateStatus(id, 'approved');
    if (!profile) {
      throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);
    }
    return profile;
  }

  async reject(id: string, rejectionReason: string): Promise<TradieProfile> {
    const profile = await this.repo.updateStatus(id, 'rejected', rejectionReason);
    if (!profile) {
      throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);
    }
    return profile;
  }

  async bulkApprove(ids: string[]): Promise<BulkActionResult> {
    let processed = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const profile = await this.repo.updateStatus(id, 'approved');
        if (profile) {
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

  async bulkReject(ids: string[], rejectionReason: string): Promise<BulkActionResult> {
    let processed = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const profile = await this.repo.updateStatus(id, 'rejected', rejectionReason);
        if (profile) {
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
