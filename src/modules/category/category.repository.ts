import { Category } from '../../models';

export class CategoryRepository {
  async findAllActive(): Promise<Category[]> {
    return Category.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });
  }

  async findActiveById(id: string): Promise<Category | null> {
    return Category.findOne({ where: { id, isActive: true } });
  }
}
