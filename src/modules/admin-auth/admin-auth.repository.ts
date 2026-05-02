import { Admin } from '../../models';

export class AdminAuthRepository {
  async findByEmail(email: string, includePassword = false): Promise<Admin | null> {
    if (includePassword) {
      return Admin.scope('withPassword').findOne({ where: { email } });
    }
    return Admin.findOne({ where: { email } });
  }

  async findByEmailWithToken(email: string): Promise<Admin | null> {
    return Admin.scope('withRefreshToken').findOne({ where: { email } });
  }

  async findById(id: string): Promise<Admin | null> {
    return Admin.findByPk(id);
  }

  async findByIdWithPassword(id: string): Promise<Admin | null> {
    return Admin.scope('withPassword').findByPk(id);
  }

  async findByIdWithToken(id: string): Promise<Admin | null> {
    return Admin.scope('withRefreshToken').findByPk(id);
  }

  async updateRefreshToken(adminId: string, refreshToken: string | null): Promise<void> {
    await Admin.update({ refreshToken }, { where: { id: adminId } });
  }

  async updateLastLogin(adminId: string): Promise<void> {
    await Admin.update({ lastLogin: new Date() }, { where: { id: adminId } });
  }
}
