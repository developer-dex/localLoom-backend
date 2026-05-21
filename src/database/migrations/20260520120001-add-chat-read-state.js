'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Rename customer_id → from_user_id
      await queryInterface.renameColumn('conversations', 'customer_id', 'from_user_id', { transaction });

      // 2. Rename tradie_id → to_user_id
      await queryInterface.renameColumn('conversations', 'tradie_id', 'to_user_id', { transaction });

      // 3. Remove the legacy unique index
      await queryInterface.removeIndex('conversations', 'unique_customer_tradie_conversation', { transaction });

      // 4. Remove legacy simple indexes (idempotent — catch silently if already absent)
      await queryInterface.removeIndex('conversations', ['from_user_id'], { transaction }).catch(() => {});
      await queryInterface.removeIndex('conversations', ['to_user_id'], { transaction }).catch(() => {});
      await queryInterface.removeIndex('conversations', 'conversations_customer_id', { transaction }).catch(() => {});
      await queryInterface.removeIndex('conversations', 'conversations_tradie_id', { transaction }).catch(() => {});

      // 5. Canonical-ordering data swap (NON-REVERSIBLE)
      await queryInterface.sequelize.query(
        `UPDATE conversations SET from_user_id = to_user_id, to_user_id = from_user_id WHERE from_user_id > to_user_id;`,
        { transaction },
      );

      // 6. CHECK constraint: from_user_id < to_user_id
      await queryInterface.sequelize.query(
        `ALTER TABLE conversations ADD CONSTRAINT chk_conversations_from_lt_to CHECK (from_user_id < to_user_id);`,
        { transaction },
      );

      // 7. Unique composite index on (from_user_id, to_user_id)
      await queryInterface.addIndex('conversations', ['from_user_id', 'to_user_id'], {
        unique: true,
        name: 'unique_from_to_conversation',
        transaction,
      });

      // 8. Simple indexes on each column
      await queryInterface.addIndex('conversations', ['from_user_id'], { transaction });
      await queryInterface.addIndex('conversations', ['to_user_id'], { transaction });

      // 9. Add read-state columns
      await queryInterface.addColumn('conversations', 'from_last_read_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      }, { transaction });
      await queryInterface.addColumn('conversations', 'to_last_read_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      }, { transaction });

      // 10. Widen messages.type from STRING(10) to STRING(20)
      await queryInterface.changeColumn('messages', 'type', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'text',
      }, { transaction });

      // 11. Descending composite index on messages for keyset pagination
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_desc ON messages (conversation_id, created_at DESC, id DESC);`,
        { transaction },
      );

      // 12. Drop the legacy ascending messages index
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS messages_conversation_id_created_at;`,
        { transaction },
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Reverse step 12: Re-create the legacy ascending messages index
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at ON messages (conversation_id, created_at);`,
        { transaction },
      );

      // Reverse step 11: Drop the descending messages index
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_messages_conversation_created_desc;`,
        { transaction },
      );

      // Reverse step 10: Narrow messages.type back to STRING(10)
      await queryInterface.changeColumn('messages', 'type', {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'text',
      }, { transaction });

      // Reverse step 9: Drop read-state columns
      await queryInterface.removeColumn('conversations', 'to_last_read_at', { transaction });
      await queryInterface.removeColumn('conversations', 'from_last_read_at', { transaction });

      // Reverse step 8: Drop simple indexes
      await queryInterface.removeIndex('conversations', ['from_user_id'], { transaction }).catch(() => {});
      await queryInterface.removeIndex('conversations', ['to_user_id'], { transaction }).catch(() => {});

      // Reverse step 7: Drop the unique composite index
      await queryInterface.removeIndex('conversations', 'unique_from_to_conversation', { transaction });

      // Reverse step 6: Drop the CHECK constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE conversations DROP CONSTRAINT IF EXISTS chk_conversations_from_lt_to;`,
        { transaction },
      );

      // NOTE: Step 5 (canonical-ordering data swap) is intentionally NOT reversed.
      // The swap is non-reversible — we cannot recover the original customer_id vs tradie_id
      // distinction for any row that was swapped. This is acceptable because the chat module
      // is role-agnostic by design.

      // Reverse step 2: Rename to_user_id → tradie_id
      await queryInterface.renameColumn('conversations', 'to_user_id', 'tradie_id', { transaction });

      // Reverse step 1: Rename from_user_id → customer_id
      await queryInterface.renameColumn('conversations', 'from_user_id', 'customer_id', { transaction });

      // Re-add legacy indexes against the restored column names
      await queryInterface.addIndex('conversations', ['customer_id', 'tradie_id'], {
        unique: true,
        name: 'unique_customer_tradie_conversation',
        transaction,
      });
      await queryInterface.addIndex('conversations', ['customer_id'], { transaction });
      await queryInterface.addIndex('conversations', ['tradie_id'], { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
