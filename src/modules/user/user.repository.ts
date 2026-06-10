import { Op } from 'sequelize';
import { User } from '../../models';
import type { IUserAttributes } from '../../models';
import { AccountStatus } from '../../common/enums';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return User.findByPk(id);
  }

  async update(id: string, data: Partial<IUserAttributes>): Promise<User | null> {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.update(data);
    return user;
  }

  async softDelete(id: string): Promise<User | null> {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.update({ status: AccountStatus.DELETED });
    return user;
  }

  async emailExistsExcluding(email: string, excludeUserId: string): Promise<boolean> {
    const count = await User.count({
      where: { email, id: { [Op.ne]: excludeUserId } },
    });
    return count > 0;
  }

  async phoneExistsExcluding(phone: string, excludeUserId: string): Promise<boolean> {
    const count = await User.count({
      where: { phone, id: { [Op.ne]: excludeUserId } },
    });
    return count > 0;
  }
}
