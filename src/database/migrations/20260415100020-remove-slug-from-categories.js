'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('categories', 'slug');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('categories', 'slug', {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
      defaultValue: '',
    });
  },
};
