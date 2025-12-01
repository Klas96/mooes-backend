const { UserProfile } = require('../nodejs-backend/models');
require('dotenv').config();

const updateNullProfiles = async () => {
  try {
    console.log('Connected to database');

    // Update profiles with null gender to 'O' (Other)
    const genderUpdateResult = await UserProfile.update(
      { gender: 'O' },
      { where: { gender: null } }
    );
    console.log(`Updated ${genderUpdateResult[0]} profiles with null gender to 'O'`);

    // Update profiles with null genderPreference to 'B' (Both)
    const preferenceUpdateResult = await UserProfile.update(
      { genderPreference: 'B' },
      { where: { genderPreference: null } }
    );
    console.log(`Updated ${preferenceUpdateResult[0]} profiles with null genderPreference to 'B'`);

    // Show current profile statistics
    const totalProfiles = await UserProfile.count();
    const maleProfiles = await UserProfile.count({ where: { gender: 'M' } });
    const femaleProfiles = await UserProfile.count({ where: { gender: 'F' } });
    const otherProfiles = await UserProfile.count({ where: { gender: 'O' } });
    const bothPreference = await UserProfile.count({ where: { genderPreference: 'B' } });
    const menPreference = await UserProfile.count({ where: { genderPreference: 'M' } });
    const womenPreference = await UserProfile.count({ where: { genderPreference: 'W' } });

    console.log('\nProfile Statistics:');
    console.log(`Total profiles: ${totalProfiles}`);
    console.log(`Male profiles: ${maleProfiles}`);
    console.log(`Female profiles: ${femaleProfiles}`);
    console.log(`Other profiles: ${otherProfiles}`);
    console.log(`Interested in both: ${bothPreference}`);
    console.log(`Interested in men: ${menPreference}`);
    console.log(`Interested in women: ${womenPreference}`);

    console.log('\nDatabase updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating database:', error);
    process.exit(1);
  }
};

updateNullProfiles(); 