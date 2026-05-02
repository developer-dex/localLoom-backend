'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('profile_visits', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      tradie_profile_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tradie_profiles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      visitor_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      is_simulated: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      visited_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('profile_visits', ['tradie_profile_id']);
    await queryInterface.addIndex('profile_visits', ['visited_at']);
    await queryInterface.addIndex('profile_visits', ['tradie_profile_id', 'visited_at']);
  },
  async down(queryInterface) { await queryInterface.dropTable('profile_visits'); },
};
