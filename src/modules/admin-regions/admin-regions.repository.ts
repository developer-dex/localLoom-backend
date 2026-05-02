import { Region } from '../../models';
import type { IRegionCreationAttributes, IRegionAttributes } from '../../models';

export class AdminRegionsRepository {
  async findAll(): Promise<Region[]> {
    return Region.findAll({ order: [['name', 'ASC']] });
  }

  async findById(id: string): Promise<Region | null> {
    return Region.findByPk(id);
  }

  async findByName(name: string): Promise<Region | null> {
    return Region.findOne({ where: { name } });
  }

  async create(data: IRegionCreationAttributes): Promise<Region> {
    return Region.create(data);
  }

  async update(id: string, data: Partial<IRegionAttributes>): Promise<Region | null> {
    const region = await Region.findByPk(id);
    if (!region) return null;
    await region.update(data);
    return region;
  }

  async softDelete(id: string): Promise<Region | null> {
    const region = await Region.findByPk(id);
    if (!region) return null;
    await region.update({ isActive: false });
    return region;
  }
}
