'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reports', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      reporter_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      target_type: { type: Sequelize.STRING(20), allowNull: false },
      target_id: { type: Sequelize.UUID, allowNull: false },
      reason: { type: Sequelize.STRING(500), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      resolved_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'admins', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('reports', ['reporter_id']);
    await queryInterface.addIndex('reports', ['target_type', 'target_id']);
    await queryInterface.addIndex('reports', ['status']);
  },
  async down(queryInterface) { await queryInterface.dropTable('reports'); },
};
