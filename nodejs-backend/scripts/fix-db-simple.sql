-- Fix relationshipType column by converting it to a simple string
-- This script will safely convert the existing data

-- Step 1: Create a temporary column
ALTER TABLE "UserProfiles" ADD COLUMN "relationshipType_new" VARCHAR(10) DEFAULT 'C';

-- Step 2: Convert existing data (take first element if it's an array, or use the value directly)
UPDATE "UserProfiles" 
SET "relationshipType_new" = 
  CASE 
    WHEN "relationshipType" IS NULL THEN 'C'
    WHEN array_length("relationshipType", 1) > 0 THEN "relationshipType"[1]::text
    ELSE COALESCE("relationshipType"::text, 'C')
  END;

-- Step 3: Drop the old column
ALTER TABLE "UserProfiles" DROP COLUMN "relationshipType";

-- Step 4: Rename the new column
ALTER TABLE "UserProfiles" RENAME COLUMN "relationshipType_new" TO "relationshipType";

-- Step 5: Add constraint to ensure valid values
ALTER TABLE "UserProfiles" 
ADD CONSTRAINT "check_relationship_type" 
CHECK ("relationshipType" IN ('C', 'S', 'F', 'B'));

-- Step 6: Set NOT NULL constraint
ALTER TABLE "UserProfiles" ALTER COLUMN "relationshipType" SET NOT NULL; 