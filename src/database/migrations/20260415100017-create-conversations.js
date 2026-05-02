'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('conversations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      customer_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tradie_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active' },
      last_message_id: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('conversations', ['customer_id', 'tradie_id'], { unique: true, name: 'unique_customer_tradie_conversation' });
    await queryInterface.addIndex('conversations', ['customer_id']);
    await queryInterface.addIndex('conversations', ['tradie_id']);
    await queryInterface.addIndex('conversations', ['updated_at']);
  },
  async down(queryInterface) { await queryInterface.dropTable('conversations'); },
};
