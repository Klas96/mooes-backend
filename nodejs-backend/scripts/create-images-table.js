const { sequelize } = require('../nodejs-backend/models');

async function createImagesTable() {
  try {
    console.log('Creating Images table...');
    
    // Create the Images table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "Images" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
        "imageUrl" VARCHAR(255) NOT NULL,
        "isPrimary" BOOLEAN DEFAULT false,
        "order" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "Images_userId" ON "Images"("userId");
      CREATE INDEX IF NOT EXISTS "Images_isPrimary" ON "Images"("isPrimary");
    `);

    console.log('Images table created successfully!');
    
    // Migrate existing profile pictures to the new Images table
    console.log('Migrating existing profile pictures...');
    
    const profiles = await sequelize.query(`
      SELECT "userId", "profilePicture" FROM "UserProfiles" 
      WHERE "profilePicture" IS NOT NULL AND "profilePicture" != ''
    `, { type: sequelize.QueryTypes.SELECT });

    for (const profile of profiles) {
      await sequelize.query(`
        INSERT INTO "Images" ("userId", "imageUrl", "isPrimary", "order", "createdAt", "updatedAt")
        VALUES ($1, $2, true, 0, NOW(), NOW())
      `, {
        bind: [profile.userId, profile.profilePicture],
        type: sequelize.QueryTypes.INSERT
      });
    }

    console.log(`Migrated ${profiles.length} profile pictures to Images table`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating Images table:', error);
    process.exit(1);
  }
}

createImagesTable(); 