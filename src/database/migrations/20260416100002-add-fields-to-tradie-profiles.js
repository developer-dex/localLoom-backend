'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Screen 2: Documents
    await queryInterface.addColumn('tradie_profiles', 'trade_license_url', { type: Sequelize.STRING(500), allowNull: true });
    await queryInterface.addColumn('tradie_profiles', 'public_liability_insurance_url', { type: Sequelize.STRING(500), allowNull: true });
    await queryInterface.addColumn('tradie_profiles', 'id_proof_url', { type: Sequelize.STRING(500), allowNull: true });

    // Screen 3: Business Details
    await queryInterface.addColumn('tradie_profiles', 'business_location', { type: Sequelize.STRING(500), allowNull: true });
    await queryInterface.addColumn('tradie_profiles', 'service_description', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('tradie_profiles', 'website', { type: Sequelize.STRING(500), allowNull: true });
    await queryInterface.addColumn('tradie_profiles', 'business_images', { type: Sequelize.JSONB, allowNull: true, defaultValue: [] });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tradie_profiles', 'trade_license_url');
    await queryInterface.removeColumn('tradie_profiles', 'public_liability_insurance_url');
    await queryInterface.removeColumn('tradie_profiles', 'id_proof_url');
    await queryInterface.removeColumn('tradie_profiles', 'business_location');
    await queryInterface.removeColumn('tradie_profiles', 'service_description');
    await queryInterface.removeColumn('tradie_profiles', 'website');
    await queryInterface.removeColumn('tradie_profiles', 'business_images');
  },
};
