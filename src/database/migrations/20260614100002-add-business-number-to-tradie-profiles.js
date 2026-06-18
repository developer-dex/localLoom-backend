'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tradie_profiles', 'business_number', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('tradie_profiles', 'business_number');
  },
};
