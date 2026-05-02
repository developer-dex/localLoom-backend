'use strict';

const crypto = require('crypto');

const regions = [
  'Northern Melbourne',
  'South East Melbourne',
  'Western Melbourne',
  'Eastern Melbourne',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = regions.map((name) => ({
      id: crypto.randomUUID(),
      name,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('regions', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('regions', { name: regions });
  },
};
