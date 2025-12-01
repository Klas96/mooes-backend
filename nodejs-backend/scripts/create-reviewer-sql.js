#!/usr/bin/env node
/**
 * Generate SQL to create reviewer account directly in database
 */

const bcrypt = require('bcryptjs');

async function generateReviewerSQL() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  SQL to Create Reviewer Account');
  console.log('════════════════════════════════════════════════════════════\n');
  
  // Hash the password
  const password = 'ReviewKey2025!';
  const hashedPassword = await bcrypt.hash(password, 12);
  
  console.log('Password hashed!\n');
  
  console.log('Run these SQL commands in your database:\n');
  console.log('-- Connect to database first:');
  console.log('-- sudo -u postgres psql YOUR_DATABASE_NAME\n');
  
  console.log('-- Step 1: Create the user');
  console.log(`INSERT INTO "Users" (
  email, 
  password, 
  "firstName", 
  "lastName", 
  "emailVerified",
  "isPremium",
  "premiumExpiry",
  "premiumPlan",
  "subscriptionStatus",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  'playstore.reviewer@mooves.test',
  '${hashedPassword}',
  'Google',
  'Reviewer',
  true,
  true,
  NOW() + INTERVAL '365 days',
  'reviewer_lifetime',
  'active',
  true,
  NOW(),
  NOW()
) RETURNING id;
`);

  console.log('\n-- Step 2: Note the ID returned above, then create profile:');
  console.log('-- Replace XXX with the user ID from above\n');
  
  console.log(`INSERT INTO "UserProfiles" (
  "userId",
  bio,
  "birthDate",
  gender,
  "genderPreference",
  "relationshipType",
  location,
  latitude,
  longitude,
  "profileComplete",
  "profileCompleteness",
  "isHidden",
  "createdAt",
  "updatedAt"
) VALUES (
  XXX,
  'Google Play Store reviewer account with full access',
  '1990-01-01',
  'M',
  'B',
  'B,C,F,S',
  'Stockholm, Sweden',
  59.3293,
  18.0686,
  true,
  100,
  false,
  NOW(),
  NOW()
);
`);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('Credentials for Play Console:');
  console.log('════════════════════════════════════════════════════════════');
  console.log('Email: playstore.reviewer@mooves.test');
  console.log('Password: ReviewKey2025!');
  console.log('════════════════════════════════════════════════════════════\n');
}

generateReviewerSQL();

