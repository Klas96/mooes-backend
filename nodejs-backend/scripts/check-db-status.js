#!/usr/bin/env node

const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('postgresql://postgres:Feuille300@34.63.76.2:5432/mooves_db', {
  dialect: 'postgres',
  logging: false
});

const checkDatabaseStatus = async () => {
  try {
    console.log('🔍 Checking Mooves Database Status...');
    console.log('=' .repeat(50));
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Get database info
    const [results] = await sequelize.query('SELECT version()');
    console.log(`📊 PostgreSQL Version: ${results[0].version}`);
    
    // Count users
    const [userCount] = await sequelize.query('SELECT COUNT(*) as count FROM "Users"');
    console.log(`👥 Total Users: ${userCount[0].count}`);
    
    // Count matches
    const [matchCount] = await sequelize.query('SELECT COUNT(*) as count FROM "Matches"');
    console.log(`💕 Total Matches: ${matchCount[0].count}`);
    
    // Count messages
    const [messageCount] = await sequelize.query('SELECT COUNT(*) as count FROM "Messages"');
    console.log(`💬 Total Messages: ${messageCount[0].count}`);
    
    // Get table sizes
    const [tableSizes] = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);
    
    console.log('\n📏 Table Sizes:');
    tableSizes.forEach(table => {
      console.log(`   ${table.tablename}: ${table.size}`);
    });
    
    console.log('\n✅ Database status check completed!');
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await sequelize.close();
  }
};

checkDatabaseStatus(); 