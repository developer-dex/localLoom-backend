'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admins', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: false },
      avatar: { type: Sequelize.STRING(500), allowNull: true },
      role: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'admin' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active' },
      last_login: { type: Sequelize.DATE, allowNull: true },
      refresh_token: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('admins', ['email'], { unique: true });
    await queryInterface.addIndex('admins', ['role']);
    await queryInterface.addIndex('admins', ['status']);
  },
  async down(queryInterface) { await queryInterface.dropTable('admins'); },
};
