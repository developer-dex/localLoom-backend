'use strict';

const crypto = require('crypto');

const icon = '/public/category/1776343495096-671749128.jpg';

const categories = [
  'Builder',
  'Carpenter',
  'Bricklayer',
  'Concreter',
  'Plasterer',
  'Renderer',
  'Tiler',
  'Roofer',
  'Cabinet Maker',
  'Flooring Installer',
  'Demolition Services',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = categories.map((name, index) => ({
      id: crypto.randomUUID(),
      name,
      icon,
      description: null,
      is_active: true,
      sort_order: index + 1,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('categories', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('categories', { name: categories });
  },
};
