import { AdminUsersRepository, UserListOptions } from './admin-users.repository';
import { User } from '../../models';
import { NotFoundException } from '../../common/exceptions';
import { PaginatedResult } from '../../common/interfaces';
import { USER_MESSAGES } from '../../common/constants';

export class AdminUsersService {
  private repo: AdminUsersRepository;

  constructor() {
    this.repo = new AdminUsersRepository();
  }

  async list(options: UserListOptions): Promise<PaginatedResult<User>> {
    return this.repo.findAll(options);
  }

  async getById(id: string): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND);
    }
    return user;
  }

  async deleteUser(id: string): Promise<User> {
    const user = await this.repo.deleteUser(id);
    if (!user) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND);
    }
    return user;
  }
}
