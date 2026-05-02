import { RegionRepository } from './region.repository';
import { Region } from '../../models';
import { NotFoundException } from '../../common/exceptions';
import { REGION_MESSAGES } from '../../common/constants';

export class RegionService {
  private regionRepository: RegionRepository;

  constructor() {
    this.regionRepository = new RegionRepository();
  }

  async getAllActive(): Promise<Region[]> {
    return this.regionRepository.findAllActive();
  }

  async getById(id: string): Promise<Region> {
    const region = await this.regionRepository.findActiveById(id);
    if (!region) {
      throw new NotFoundException(REGION_MESSAGES.NOT_FOUND);
    }
    return region;
  }
}
