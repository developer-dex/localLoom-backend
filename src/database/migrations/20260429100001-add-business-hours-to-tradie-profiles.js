'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tradie_profiles', 'time_from', {
      type: Sequelize.STRING(5),
      allowNull: true,
    });
    await queryInterface.addColumn('tradie_profiles', 'time_to', {
      type: Sequelize.STRING(5),
      allowNull: true,
    });
    await queryInterface.addColumn('tradie_profiles', 'open_days', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    });
    await queryInterface.addColumn('tradie_profiles', 'abn_data', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tradie_profiles', 'time_from');
    await queryInterface.removeColumn('tradie_profiles', 'time_to');
    await queryInterface.removeColumn('tradie_profiles', 'open_days');
    await queryInterface.removeColumn('tradie_profiles', 'abn_data');
  },
};
