const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

async function createConversationsTable() {
  try {
    console.log('Starting Conversations table migration...');

    // Check if table already exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'Conversations'
    `);

    if (tables.length > 0) {
      console.log('✅ Conversations table already exists');
      return;
    }

    // Create Conversations table
    await sequelize.query(`
      CREATE TABLE "Conversations" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        metadata JSONB,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    console.log('✅ Created Conversations table');

    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX "conversations_userId_timestamp_idx" 
      ON "Conversations" ("userId", timestamp DESC)
    `);

    await sequelize.query(`
      CREATE INDEX "conversations_userId_createdAt_idx" 
      ON "Conversations" ("userId", "createdAt" DESC)
    `);

    console.log('✅ Created indexes on Conversations table');
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  createConversationsTable()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createConversationsTable };

