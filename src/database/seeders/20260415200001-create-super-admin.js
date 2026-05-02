'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Test@123', salt);

    await queryInterface.bulkInsert('admins', [
      {
        id: crypto.randomUUID(),
        name: 'Super Admin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'super_admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('admins', { email: 'admin@gmail.com' });
  },
};
