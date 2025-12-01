const { sequelize } = require('../nodejs-backend/models');

async function fixRelationshipTypeColumn() {
  try {
    await sequelize.query(`
      ALTER TABLE "UserProfiles"
        ALTER COLUMN "relationshipType" DROP DEFAULT,
        ALTER COLUMN "relationshipType" TYPE VARCHAR(255) USING
          (CASE
            WHEN "relationshipType" IS NULL THEN 'C'
            WHEN pg_typeof("relationshipType")::text = 'character varying[]' THEN "relationshipType"[1]::text
            ELSE "relationshipType"::text
          END),
        ALTER COLUMN "relationshipType" SET DEFAULT 'C',
        ALTER COLUMN "relationshipType" SET NOT NULL;
    `);
    console.log('✅ relationshipType column fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing relationshipType column:', error);
  } finally {
    await sequelize.close();
  }
}

fixRelationshipTypeColumn(); 