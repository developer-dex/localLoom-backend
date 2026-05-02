import { AdminRegionsRepository } from './admin-regions.repository';
import { CreateRegionDto, UpdateRegionDto } from './admin-regions.interface';
import { Region } from '../../models';
import { NotFoundException, ConflictException } from '../../common/exceptions';
import { REGION_MESSAGES } from '../../common/constants';

export class AdminRegionsService {
  private repo: AdminRegionsRepository;

  constructor() {
    this.repo = new AdminRegionsRepository();
  }

  async getAll(): Promise<Region[]> {
    return this.repo.findAll();
  }

  async create(dto: CreateRegionDto): Promise<Region> {
    const existing = await this.repo.findByName(dto.name);
    if (existing) {
      throw new ConflictException(REGION_MESSAGES.ALREADY_EXISTS);
    }
    return this.repo.create({ name: dto.name });
  }

  async update(id: string, dto: UpdateRegionDto): Promise<Region> {
    if (dto.name) {
      const existing = await this.repo.findByName(dto.name);
      if (existing && existing.id !== id) {
        throw new ConflictException(REGION_MESSAGES.ALREADY_EXISTS);
      }
    }

    const region = await this.repo.update(id, dto);
    if (!region) {
      throw new NotFoundException(REGION_MESSAGES.NOT_FOUND);
    }
    return region;
  }

  async softDelete(id: string): Promise<Region> {
    const region = await this.repo.softDelete(id);
    if (!region) {
      throw new NotFoundException(REGION_MESSAGES.NOT_FOUND);
    }
    return region;
  }
}
