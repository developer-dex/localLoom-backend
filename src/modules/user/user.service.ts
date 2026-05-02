import { UserRepository } from './user.repository';
import { UpdateUserDto } from './user.interface';
import { User } from '../../models';
import { NotFoundException } from '../../common/exceptions';
import { USER_MESSAGES } from '../../common/constants';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getMe(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND);
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.update(userId, dto);
    if (!user) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND);
    }
    return user;
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    const user = await this.userRepository.update(userId, { avatar: avatarUrl });
    if (!user) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND);
    }
    return user;
  }

  async deleteMe(userId: string): Promise<void> {
    const user = await this.userRepository.softDelete(userId);
    if (!user) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND);
    }
  }
}
