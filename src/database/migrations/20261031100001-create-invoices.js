'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoices', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      tradie_profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tradie_profiles', key: 'id' },
        onDelete: 'CASCADE',
      },
      // Per-tradie running number; rendered as INV-0001.
      sequence_number: { type: Sequelize.INTEGER, allowNull: false },
      // Set when the client is an existing LocalLoom user picked from "Select Existing Client".
      client_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      client_first_name: { type: Sequelize.STRING(100), allowNull: true },
      client_last_name: { type: Sequelize.STRING(100), allowNull: true },
      client_address: { type: Sequelize.STRING(500), allowNull: true },
      client_phone: { type: Sequelize.STRING(20), allowNull: true },
      client_email: { type: Sequelize.STRING(255), allowNull: true },
      title: { type: Sequelize.STRING(200), allowNull: false, defaultValue: 'For Services Rendered' },
      issue_date_mode: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'date_sent' },
      issued_date: { type: Sequelize.DATEONLY, allowNull: true },
      payment_terms: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'due_on_receipt' },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      discount_type: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'amount' },
      discount_value: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      tax_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      discount_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      tax_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'AUD' },
      client_message: { type: Sequelize.TEXT, allowNull: true },
      disclaimer: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('invoices', ['tradie_profile_id', 'sequence_number'], {
      unique: true,
      name: 'unique_invoice_sequence_per_tradie',
    });
    await queryInterface.addIndex('invoices', ['tradie_profile_id', 'status']);
    await queryInterface.addIndex('invoices', ['client_user_id']);

    await queryInterface.createTable('invoice_line_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
      invoice_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'invoices', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('invoice_line_items', ['invoice_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('invoice_line_items');
    await queryInterface.dropTable('invoices');
  },
};
