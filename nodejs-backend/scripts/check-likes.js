require('dotenv').config();
const { sequelize, User, UserProfile, Match } = require('../nodejs-backend/models');
const { Op } = require('sequelize');

async function checkLikesForUser(email) {
  try {
    console.log('🔍 Checking likes for user...');
    console.log('📧 Email:', email);
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Find the user by email
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('❌ User not found with that email address');
      return;
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    
    // Find the user's profile
    const userProfile = await UserProfile.findOne({ where: { userId: user.id } });
    
    if (!userProfile) {
      console.log('❌ User profile not found');
      return;
    }
    
    console.log(`✅ Found user profile: ${userProfile.id}`);
    
    // Find all matches where this user has liked someone
    const likesGiven = await Match.findAll({
      where: {
        [Op.or]: [
          {
            user1Id: userProfile.id,
            user1Liked: true
          },
          {
            user2Id: userProfile.id,
            user2Liked: true
          }
        ]
      },
      include: [
        {
          model: UserProfile,
          as: 'user1',
          include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }]
        },
        {
          model: UserProfile,
          as: 'user2',
          include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }]
        }
      ]
    });
    
    console.log(`\n📊 Likes Summary:`);
    console.log(`Total likes given: ${likesGiven.length}`);
    
    if (likesGiven.length > 0) {
      console.log('\n🔍 Detailed likes:');
      for (const match of likesGiven) {
        const isUser1 = match.user1Id === userProfile.id;
        const likedProfile = isUser1 ? match.user2 : match.user1;
        const likedUser = likedProfile.user;
        
        console.log(`  - Liked: ${likedUser.firstName} ${likedUser.lastName} (Profile ID: ${likedProfile.id})`);
        console.log(`    Match ID: ${match.id}, Status: ${match.status}`);
        console.log(`    User was: ${isUser1 ? 'user1' : 'user2'}`);
      }
    } else {
      console.log('  - No likes found');
    }
    
    // Also check if they have any matches (mutual likes)
    const matches = likesGiven.filter(match => match.status === 'matched');
    console.log(`\n💕 Mutual matches: ${matches.length}`);
    
  } catch (error) {
    console.error('❌ Error checking likes:', error);
  } finally {
    await sequelize.close();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide an email address');
  console.log('Usage: node check-likes.js <email>');
  process.exit(1);
}

checkLikesForUser(email); 