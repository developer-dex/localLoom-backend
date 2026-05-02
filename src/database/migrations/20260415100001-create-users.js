'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false, defaultValue: '' },
      email: { type: Sequelize.STRING(255), allowNull: true, unique: true },
      phone: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: true },
      avatar: { type: Sequelize.STRING(500), allowNull: true },
      role: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'customer' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active' },
      is_phone_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      overall_rating: { type: Sequelize.DECIMAL(3, 2), allowNull: false, defaultValue: 0.0 },
      last_login: { type: Sequelize.DATE, allowNull: true },
      refresh_token: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('users', ['phone'], { unique: true });
    await queryInterface.addIndex('users', ['email'], { unique: true, where: { email: { [Sequelize.Op.ne]: null } } });
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['status']);
  },
  async down(queryInterface) { await queryInterface.dropTable('users'); },
};
