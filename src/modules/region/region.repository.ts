import { Region } from '../../models';

export class RegionRepository {
  async findAllActive(): Promise<Region[]> {
    return Region.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
    });
  }

  async findActiveById(id: string): Promise<Region | null> {
    return Region.findOne({ where: { id, isActive: true } });
  }
}
