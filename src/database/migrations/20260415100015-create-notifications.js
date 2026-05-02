'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      user_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      type: { type: Sequelize.STRING(50), allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      data: { type: Sequelize.JSONB, allowNull: true },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      sent_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      read_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('notifications', ['user_id']);
    await queryInterface.addIndex('notifications', ['user_id', 'is_read']);
    await queryInterface.addIndex('notifications', ['type']);
  },
  async down(queryInterface) { await queryInterface.dropTable('notifications'); },
};
