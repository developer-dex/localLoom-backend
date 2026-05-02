'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('suburbs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      slug: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      region_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'regions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      postcode: { type: Sequelize.STRING(10), allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('suburbs', ['region_id']);
    await queryInterface.addIndex('suburbs', ['slug'], { unique: true });
    await queryInterface.addIndex('suburbs', ['postcode']);
    await queryInterface.addIndex('suburbs', ['latitude', 'longitude']);
  },
  async down(queryInterface) { await queryInterface.dropTable('suburbs'); },
};
