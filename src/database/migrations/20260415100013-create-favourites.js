'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('favourites', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      customer_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tradie_profile_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tradie_profiles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('favourites', ['customer_id', 'tradie_profile_id'], { unique: true, name: 'unique_customer_tradie_favourite' });
    await queryInterface.addIndex('favourites', ['customer_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('favourites'); },
};
