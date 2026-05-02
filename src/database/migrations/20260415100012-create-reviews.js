'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reviews', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      customer_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tradie_profile_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tradie_profiles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      rating: { type: Sequelize.SMALLINT, allowNull: false },
      comment: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      reviewed_by_admin: { type: Sequelize.UUID, allowNull: true, references: { model: 'admins', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('reviews', ['tradie_profile_id']);
    await queryInterface.addIndex('reviews', ['customer_id']);
    await queryInterface.addIndex('reviews', ['status']);
    await queryInterface.addIndex('reviews', ['customer_id', 'tradie_profile_id'], { unique: true, name: 'unique_customer_tradie_review' });
  },
  async down(queryInterface) { await queryInterface.dropTable('reviews'); },
};
