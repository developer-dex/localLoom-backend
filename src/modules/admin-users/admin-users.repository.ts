import { Op, Transaction } from 'sequelize';
import { sequelize } from '../../config/database';
import {
  User,
  TradieProfile,
  TradieService,
  TradieRegion,
  TradieWorkPhoto,
  Notification,
  DeviceToken,
  Favourite,
  ContactLog,
  ProfileVisit,
  Review,
  Report,
} from '../../models';
import { AccountStatus } from '../../common/enums';
import { PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta } from '../../common/utils';

export interface UserListOptions {
  page: number;
  limit: number;
  status?: string;
  role?: string;
  search?: string;
}

export class AdminUsersRepository {
  async findAll(options: UserListOptions): Promise<PaginatedResult<User>> {
    const { page, limit, status, role, search } = options;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (role) {
      where.role = role;
    }

    if (search) {
      where[Op.or as unknown as string] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count: total, rows: data } = await User.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit,
      distinct: true,
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string): Promise<User | null> {
    return User.findByPk(id, {
      include: [
        { model: TradieProfile, as: 'tradieProfile' },
      ],
    });
  }

  /**
   * Deletes user data while preserving chat history.
   *
   * What gets deleted:
   * - Notifications, device tokens, favourites, contact logs, profile visits
   * - Reviews (written by this user)
   * - Reports (submitted by this user)
   * - Tradie profile + related (work photos, services, regions)
   *
   * What is preserved:
   * - Conversations (so other participants can still see the chat)
   * - Messages (so chat history remains intact for the other user)
   *
   * The user record itself is soft-deleted (status set to 'deleted')
   * and personal fields are anonymized.
   */
  async deleteUser(id: string): Promise<User | null> {
    const user = await User.findByPk(id);
    if (!user) return null;

    await sequelize.transaction(async (t: Transaction) => {
      // 1. Delete tradie profile and related data
      const tradieProfile = await TradieProfile.findOne({ where: { userId: id }, transaction: t });
      if (tradieProfile) {
        await TradieWorkPhoto.destroy({ where: { tradieProfileId: tradieProfile.id }, transaction: t });
        await TradieService.destroy({ where: { tradieProfileId: tradieProfile.id }, transaction: t });
        await TradieRegion.destroy({ where: { tradieProfileId: tradieProfile.id }, transaction: t });
        await Favourite.destroy({ where: { tradieProfileId: tradieProfile.id }, transaction: t });
        await ContactLog.destroy({ where: { tradieProfileId: tradieProfile.id }, transaction: t });
        await ProfileVisit.destroy({ where: { tradieProfileId: tradieProfile.id }, transaction: t });
        await Review.destroy({ where: { tradieProfileId: tradieProfile.id }, transaction: t });
        await tradieProfile.destroy({ transaction: t });
      }

      // 2. Delete user-owned data (as customer)
      await Favourite.destroy({ where: { customerId: id }, transaction: t });
      await ContactLog.destroy({ where: { customerId: id }, transaction: t });
      await ProfileVisit.destroy({ where: { visitorId: id }, transaction: t });
      await Review.destroy({ where: { customerId: id }, transaction: t });
      await Report.destroy({ where: { reporterId: id }, transaction: t });
      await Notification.destroy({ where: { userId: id }, transaction: t });
      await DeviceToken.destroy({ where: { userId: id }, transaction: t });

      // 3. Soft-delete user and anonymize personal data
      // Keep the row so chat messages still reference a valid sender_id
      await user.update(
        {
          status: AccountStatus.DELETED,
          name: 'Deleted User',
          email: null,
          phone: `deleted_${id.slice(0, 8)}`,
          avatar: null,
          password: null,
          refreshToken: null,
          isPhoneVerified: false,
        },
        { transaction: t },
      );
    });

    return user;
  }
}
