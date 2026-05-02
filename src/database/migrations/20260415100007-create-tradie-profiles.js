'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tradie_profiles', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      user_id: { type: Sequelize.UUID, allowNull: false, unique: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      business_name: { type: Sequelize.STRING(200), allowNull: true },
      abn: { type: Sequelize.STRING(20), allowNull: false },
      abn_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      years_of_experience: { type: Sequelize.INTEGER, allowNull: false },
      bio: { type: Sequelize.TEXT, allowNull: true },
      intro_video_url: { type: Sequelize.STRING(500), allowNull: true },
      awards: { type: Sequelize.TEXT, allowNull: true },
      profile_photo: { type: Sequelize.STRING(500), allowNull: true },
      service_radius_km: { type: Sequelize.INTEGER, allowNull: true },
      profile_status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      has_license: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      license_number: { type: Sequelize.STRING(50), allowNull: true },
      license_expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      insurance_url: { type: Sequelize.STRING(500), allowNull: true },
      insurance_expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      insurance_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_available: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_emergency_available: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      terms_accepted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('tradie_profiles', ['user_id'], { unique: true });
    await queryInterface.addIndex('tradie_profiles', ['profile_status']);
    await queryInterface.addIndex('tradie_profiles', ['is_available']);
    await queryInterface.addIndex('tradie_profiles', ['is_emergency_available']);
    await queryInterface.addIndex('tradie_profiles', ['abn']);
  },
  async down(queryInterface) { await queryInterface.dropTable('tradie_profiles'); },
};
