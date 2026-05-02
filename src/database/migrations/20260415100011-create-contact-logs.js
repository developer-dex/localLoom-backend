'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contact_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      customer_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tradie_profile_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'tradie_profiles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      contacted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      review_eligible_at: { type: Sequelize.DATE, allowNull: false },
      reminder_24h_sent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      reminder_48h_sent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      reminder_72h_sent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    });
    await queryInterface.addIndex('contact_logs', ['customer_id', 'tradie_profile_id']);
    await queryInterface.addIndex('contact_logs', ['review_eligible_at']);
    await queryInterface.addIndex('contact_logs', ['contacted_at']);
  },
  async down(queryInterface) { await queryInterface.dropTable('contact_logs'); },
};
