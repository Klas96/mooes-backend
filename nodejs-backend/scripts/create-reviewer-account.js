#!/usr/bin/env node
require('dotenv').config();
const { sequelize, User, UserProfile } = require('../models');

/**
 * Create a dedicated Google Play reviewer account
 * This account will be used by Google Play reviewers to test the app
 */
async function createReviewerAccount() {
  try {
    console.log('🎯 Creating Google Play Reviewer Account...\n');
    
    const reviewerData = {
      email: 'playstore.reviewer@mooves.test',
      password: 'ReviewKey2025!',
      firstName: 'Google',
      lastName: 'Reviewer',
      emailVerified: true,
      isPremium: true,
      premiumExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      premiumPlan: 'reviewer_lifetime',
      subscriptionStatus: 'active',
      isActive: true,
      lastLogin: new Date()
    };

    // Check if reviewer account already exists
    let user = await User.findOne({ where: { email: reviewerData.email } });
    
    if (user) {
      console.log('⚠️  Reviewer account already exists. Updating...');
      await user.update(reviewerData);
      console.log('✅ Reviewer account updated!');
    } else {
      console.log('📝 Creating new reviewer account...');
      user = await User.create(reviewerData);
      console.log('✅ Reviewer account created!');
    }

    // Create or update profile
    const profileData = {
      userId: user.id,
      bio: 'Google Play Store reviewer account - full access to all features for testing purposes.',
      birthDate: '1990-01-01',
      gender: 'M',
      genderPreference: 'B',
      relationshipType: 'B,C,F,S',
      location: 'Stockholm, Sweden',
      latitude: 59.3293,
      longitude: 18.0686,
      interests: 'Testing, Quality Assurance, App Development',
      occupation: 'App Reviewer',
      education: 'University',
      height: 180,
      profileComplete: true,
      profileCompleteness: 100,
      isHidden: false
    };

    let profile = await UserProfile.findOne({ where: { userId: user.id } });
    
    if (profile) {
      console.log('📝 Updating reviewer profile...');
      await profile.update(profileData);
      console.log('✅ Reviewer profile updated!');
    } else {
      console.log('📝 Creating reviewer profile...');
      profile = await UserProfile.create(profileData);
      console.log('✅ Reviewer profile created!');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   ✅ GOOGLE PLAY REVIEWER ACCOUNT READY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📊 Account Details:');
    console.log(`   ID:              ${user.id}`);
    console.log(`   Email:           ${reviewerData.email}`);
    console.log(`   Password:        ${reviewerData.password}`);
    console.log(`   Name:            ${user.firstName} ${user.lastName}`);
    console.log(`   Premium:         ${user.isPremium ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`   Premium Plan:    ${user.premiumPlan}`);
    console.log(`   Premium Expires: ${user.premiumExpiry}`);
    console.log(`   Profile:         ${profile.profileComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   📋 COPY THIS TO GOOGLE PLAY CONSOLE');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const instructions = `
INLOGGNINGSUPPGIFTER FÖR GRANSKARE
────────────────────────────────────

E-postadress: ${reviewerData.email}
Lösenord: ${reviewerData.password}

INSTRUKTIONER FÖR GRANSKNING
────────────────────────────────────

1. Öppna Mooves-appen
2. På välkomstskärmen, tryck på "Logga in"
3. Ange e-postadressen: ${reviewerData.email}
4. Ange lösenordet: ${reviewerData.password}
5. Tryck på "Logga in"

KONTOFUNKTIONER
────────────────────────────────────

Detta konto har följande funktioner aktiverade:
✅ Verifierad e-postadress
✅ Premium-prenumeration (livstid)
✅ Komplett profil med alla fält ifyllda
✅ Obegränsade likes
✅ 100 AI-meddelanden
✅ Global sökning
✅ Avancerade filter
✅ Läskvitton
✅ Se vem som gillar dig
✅ Prioriterad matchning
✅ Premium-support

TESTOMRÅDEN
────────────────────────────────────

Med detta konto kan granskarna testa:
- Inloggning och autentisering
- Profilvisning och redigering
- Matchningsfunktioner
- Meddelandesystem
- Gilla/ogilla-funktioner
- Premium-funktioner
- Platsbaserad sökning
- Filter och inställningar
- Notifikationer

TEKNISK INFORMATION
────────────────────────────────────

Kontotyp:          Granskarkonto (reviewer)
Server:            Produktionsserver
Database:          PostgreSQL
Premium-status:    Livstid
Profilens status:  100% komplett
Verifiering:       ✅ Verifierad

SUPPORT
────────────────────────────────────

Om det uppstår problem vid granskningen:
- Kontakta utvecklaren via Play Console
- Användarkontot är permanent och dedikerat för granskning
- Alla funktioner är fullt aktiverade

────────────────────────────────────
Skapad: ${new Date().toLocaleString('sv-SE')}
Uppdaterad: ${new Date().toLocaleString('sv-SE')}
────────────────────────────────────
`;

    console.log(instructions);
    
    // Save instructions to file
    const fs = require('fs');
    const path = require('path');
    const instructionsPath = path.join(__dirname, '..', '..', 'google-play-reviewer-instructions.txt');
    fs.writeFileSync(instructionsPath, instructions);
    
    console.log(`\n💾 Instruktioner sparade till: google-play-reviewer-instructions.txt`);
    console.log('\n✅ Klar! Kopiera texten ovan till Google Play Console.\n');
    
    return {
      user,
      profile,
      credentials: {
        email: reviewerData.email,
        password: reviewerData.password
      }
    };
    
  } catch (error) {
    console.error('❌ Error creating reviewer account:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  createReviewerAccount()
    .then(() => {
      console.log('🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = createReviewerAccount;

