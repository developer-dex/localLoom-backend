'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tradie_work_photos', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      tradie_profile_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tradie_profiles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      image_url: { type: Sequelize.STRING(500), allowNull: false },
      caption: { type: Sequelize.STRING(200), allowNull: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('tradie_work_photos', ['tradie_profile_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('tradie_work_photos'); },
};
