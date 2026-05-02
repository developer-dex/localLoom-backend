'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tradie_services', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      tradie_profile_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tradie_profiles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      category_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('tradie_services', ['tradie_profile_id', 'category_id'], { unique: true, name: 'unique_tradie_service' });
  },
  async down(queryInterface) { await queryInterface.dropTable('tradie_services'); },
};
