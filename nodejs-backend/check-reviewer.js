require('dotenv').config();
const { sequelize, User } = require('./models');

async function checkUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    const email = 'playstore.reviewer@mooves.test';
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('❌ User NOT found!');
      process.exit(1);
    }
    
    console.log('✅ User found:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Email verified:', user.emailVerified);
    console.log('Password hash exists:', !!user.password);
    console.log('Password hash:', user.password.substring(0, 20) + '...');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

checkUser();

