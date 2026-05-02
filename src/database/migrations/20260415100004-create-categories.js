'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      slug: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      icon: { type: Sequelize.STRING(500), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('categories', ['slug'], { unique: true });
    await queryInterface.addIndex('categories', ['is_active']);
  },
  async down(queryInterface) { await queryInterface.dropTable('categories'); },
};
