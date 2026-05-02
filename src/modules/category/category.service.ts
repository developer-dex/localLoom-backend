import { CategoryRepository } from './category.repository';
import { Category } from '../../models';
import { NotFoundException } from '../../common/exceptions';
import { CATEGORY_MESSAGES } from '../../common/constants';

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  async getAllActive(): Promise<Category[]> {
    return this.categoryRepository.findAllActive();
  }

  async getById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findActiveById(id);
    if (!category) {
      throw new NotFoundException(CATEGORY_MESSAGES.NOT_FOUND);
    }
    return category;
  }
}
