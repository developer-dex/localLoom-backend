import { AdminCategoriesRepository } from './admin-categories.repository';
import { CreateCategoryDto, UpdateCategoryDto } from './admin-categories.interface';
import { Category } from '../../models';
import { NotFoundException, ConflictException } from '../../common/exceptions';
import { CATEGORY_MESSAGES } from '../../common/constants';

export class AdminCategoriesService {
  private repo: AdminCategoriesRepository;

  constructor() {
    this.repo = new AdminCategoriesRepository();
  }

  async getAll(): Promise<Category[]> {
    return this.repo.findAll();
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.repo.findByName(dto.name);
    if (existing) {
      throw new ConflictException(CATEGORY_MESSAGES.ALREADY_EXISTS);
    }

    return this.repo.create({ name: dto.name, icon: dto.icon, description: dto.description, sortOrder: dto.sortOrder });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    if (dto.name) {
      const existing = await this.repo.findByName(dto.name);
      if (existing && existing.id !== id) {
        throw new ConflictException(CATEGORY_MESSAGES.ALREADY_EXISTS);
      }
    }

    const category = await this.repo.update(id, dto);
    if (!category) {
      throw new NotFoundException(CATEGORY_MESSAGES.NOT_FOUND);
    }
    return category;
  }

  async softDelete(id: string): Promise<Category> {
    const category = await this.repo.softDelete(id);
    if (!category) {
      throw new NotFoundException(CATEGORY_MESSAGES.NOT_FOUND);
    }
    return category;
  }
}
