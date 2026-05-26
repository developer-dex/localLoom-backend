import { UserRepository } from './user.repository';
import { UpdateUserDto } from './user.interface';
import { User, TradieProfile } from '../../models';
import { NotFoundException } from '../../common/exceptions';
import { USER_MESSAGES } from '../../common/constants';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getMe(userId: string): Promise<User & { profile_setup: { profile_exist: boolean; profile_status: string }; is_tradie: boolean; is_customer: boolean; tradie_profile_status: string | null }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND);
    }

    const profile = await TradieProfile.findOne({ where: { userId } });
    const profile_setup = profile
      ? { profile_exist: true, profile_status: profile.profileStatus }
      : { profile_exist: false, profile_status: 'not found' };

    return Object.assign(user, {
      profile_setup,
      is_tradie: profile !== null,
      is_customer: true,
      tradie_profile_status: profile ? profile.profileStatus : null,
    });
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
