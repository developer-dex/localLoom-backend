import { Category } from '../../models';
import type { ICategoryCreationAttributes, ICategoryAttributes } from '../../models';

export class AdminCategoriesRepository {
  async findAll(): Promise<Category[]> {
    return Category.findAll({ order: [['sortOrder', 'ASC'], ['name', 'ASC']] });
  }

  async findById(id: string): Promise<Category | null> {
    return Category.findByPk(id);
  }

  async findByName(name: string): Promise<Category | null> {
    return Category.findOne({ where: { name } });
  }

  async create(data: ICategoryCreationAttributes): Promise<Category> {
    return Category.create(data);
  }

  async update(id: string, data: Partial<ICategoryAttributes>): Promise<Category | null> {
    const category = await Category.findByPk(id);
    if (!category) return null;
    await category.update(data);
    return category;
  }

  async softDelete(id: string): Promise<Category | null> {
    const category = await Category.findByPk(id);
    if (!category) return null;
    await category.update({ isActive: false });
    return category;
  }
}
