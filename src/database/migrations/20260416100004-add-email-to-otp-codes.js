'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add email column after phone
    await queryInterface.addColumn('otp_codes', 'email', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'phone',
    });

    // Change phone to allowNull: true
    await queryInterface.changeColumn('otp_codes', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    // Add index on email
    await queryInterface.addIndex('otp_codes', ['email']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('otp_codes', ['email']);
    await queryInterface.removeColumn('otp_codes', 'email');
    await queryInterface.changeColumn('otp_codes', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: false,
    });
  },
};
