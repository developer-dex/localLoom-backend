'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('tradie_work_photos', 'caption');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('tradie_work_photos', 'caption', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
  },
};
