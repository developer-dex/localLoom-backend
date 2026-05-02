'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tradie_regions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      tradie_profile_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tradie_profiles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      region_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'regions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('tradie_regions', ['tradie_profile_id', 'region_id'], { unique: true, name: 'unique_tradie_region' });
  },
  async down(queryInterface) { await queryInterface.dropTable('tradie_regions'); },
};
