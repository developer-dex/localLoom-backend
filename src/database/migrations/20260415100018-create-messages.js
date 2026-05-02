'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('messages', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      conversation_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'conversations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      sender_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      content: { type: Sequelize.TEXT, allowNull: false },
      type: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'text' },
      status: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'sent' },
      attachments: { type: Sequelize.JSONB, allowNull: true },
      is_deleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('messages', ['conversation_id', 'created_at']);
    await queryInterface.addIndex('messages', ['sender_id']);

    // Add FK from conversations.last_message_id → messages.id
    await queryInterface.addConstraint('conversations', {
      fields: ['last_message_id'],
      type: 'foreign key',
      name: 'fk_conversations_last_message',
      references: { table: 'messages', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint('conversations', 'fk_conversations_last_message');
    await queryInterface.dropTable('messages');
  },
};
