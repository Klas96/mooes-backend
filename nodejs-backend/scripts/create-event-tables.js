const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: console.log
  }
);

async function createEventTables() {
  try {
    console.log('Creating Event tables...');

    // Create Events table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "Events" (
        "id" SERIAL PRIMARY KEY,
        "creatorId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "location" VARCHAR(200),
        "latitude" DECIMAL(10, 8),
        "longitude" DECIMAL(11, 8),
        "eventDate" DATE,
        "eventTime" TIME,
        "maxParticipants" INTEGER,
        "currentParticipants" INTEGER DEFAULT 0 NOT NULL,
        "isPublic" BOOLEAN DEFAULT true NOT NULL,
        "status" VARCHAR(20) DEFAULT 'upcoming' NOT NULL 
          CHECK ("status" IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
        "imageUrl" VARCHAR(500),
        "tags" TEXT DEFAULT '[]',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('✓ Events table created');

    // Create EventParticipants table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "EventParticipants" (
        "id" SERIAL PRIMARY KEY,
        "eventId" INTEGER NOT NULL REFERENCES "Events"("id") ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
        "status" VARCHAR(20) DEFAULT 'interested' NOT NULL
          CHECK ("status" IN ('interested', 'going', 'not_going', 'maybe')),
        "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE ("eventId", "userId")
      );
    `);

    console.log('✓ EventParticipants table created');

    // Create indexes
    await sequelize.query('CREATE INDEX IF NOT EXISTS "events_creator_id" ON "Events"("creatorId");');
    await sequelize.query('CREATE INDEX IF NOT EXISTS "events_date" ON "Events"("eventDate");');
    await sequelize.query('CREATE INDEX IF NOT EXISTS "events_status" ON "Events"("status");');
    await sequelize.query('CREATE INDEX IF NOT EXISTS "events_location" ON "Events"("latitude", "longitude");');
    await sequelize.query('CREATE INDEX IF NOT EXISTS "event_participants_event_id" ON "EventParticipants"("eventId");');
    await sequelize.query('CREATE INDEX IF NOT EXISTS "event_participants_user_id" ON "EventParticipants"("userId");');

    console.log('✓ Indexes created');

    console.log('\n✅ Event tables created successfully!');
    
  } catch (error) {
    console.error('Error creating event tables:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
createEventTables()
  .then(() => {
    console.log('\n✅ Database migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

