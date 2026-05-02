'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otp_codes', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      code: { type: Sequelize.STRING(6), allowNull: false },
      purpose: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'login' },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      max_attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 3 },
      is_used: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('otp_codes', ['phone']);
    await queryInterface.addIndex('otp_codes', ['phone', 'code']);
    await queryInterface.addIndex('otp_codes', ['expires_at']);
  },
  async down(queryInterface) { await queryInterface.dropTable('otp_codes'); },
};
