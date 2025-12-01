#!/usr/bin/env node

/**
 * Analytics script for AI chat optimization
 * Shows intent distribution, token savings, and usage patterns
 */

const { sequelize, Conversation, User } = require('../models');

async function analyzeAIUsage() {
  try {
    console.log('\n📊 AI Chat Usage Analytics');
    console.log('=' .repeat(60));

    // 1. Intent Distribution
    console.log('\n1️⃣  Intent Distribution (Last 7 days)');
    console.log('-'.repeat(60));
    
    const [intentStats] = await sequelize.query(`
      SELECT 
        COALESCE(metadata->>'intent', 'unknown') as intent,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM "Conversations"
      WHERE role = 'user'
        AND "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY metadata->>'intent'
      ORDER BY count DESC
    `);
    
    console.table(intentStats);

    // 2. Response Types
    console.log('\n2️⃣  Response Types Distribution');
    console.log('-'.repeat(60));
    
    const [responseStats] = await sequelize.query(`
      SELECT 
        metadata->>'responseType' as response_type,
        COUNT(*) as count,
        AVG((metadata->>'recommendationCount')::int) as avg_recommendations
      FROM "Conversations"
      WHERE role = 'assistant'
        AND metadata->>'responseType' IS NOT NULL
        AND "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY metadata->>'responseType'
      ORDER BY count DESC
    `);
    
    console.table(responseStats);

    // 3. Profile Completeness
    console.log('\n3️⃣  User Profile Completeness');
    console.log('-'.repeat(60));
    
    const [profileStats] = await sequelize.query(`
      SELECT 
        metadata->>'profileCompleteness' as profile_status,
        COUNT(DISTINCT "userId") as unique_users,
        COUNT(*) as message_count
      FROM "Conversations"
      WHERE role = 'user'
        AND metadata->>'profileCompleteness' IS NOT NULL
        AND "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY metadata->>'profileCompleteness'
      ORDER BY unique_users DESC
    `);
    
    console.table(profileStats);

    // 4. Streaming vs Non-streaming
    console.log('\n4️⃣  Streaming vs Non-streaming Usage');
    console.log('-'.repeat(60));
    
    const [streamingStats] = await sequelize.query(`
      SELECT 
        CASE 
          WHEN (metadata->>'streaming')::boolean = true THEN 'Streaming'
          ELSE 'Non-streaming'
        END as mode,
        COUNT(*) as message_count,
        AVG(LENGTH(content)) as avg_response_length,
        MIN("createdAt") as first_used
      FROM "Conversations"
      WHERE role = 'assistant'
        AND "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY (metadata->>'streaming')::boolean
    `);
    
    console.table(streamingStats);

    // 5. Daily Activity
    console.log('\n5️⃣  Daily Message Volume (Last 7 days)');
    console.log('-'.repeat(60));
    
    const [dailyStats] = await sequelize.query(`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as total_messages,
        COUNT(DISTINCT "userId") as active_users,
        ROUND(COUNT(*)::numeric / COUNT(DISTINCT "userId"), 2) as avg_msgs_per_user
      FROM "Conversations"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `);
    
    console.table(dailyStats);

    // 6. Top Users
    console.log('\n6️⃣  Most Active Users (Last 7 days)');
    console.log('-'.repeat(60));
    
    const [topUsers] = await sequelize.query(`
      SELECT 
        c."userId",
        u."firstName" || ' ' || u."lastName" as user_name,
        u."isPremium",
        COUNT(*) as message_count,
        COUNT(*) FILTER (WHERE c.role = 'user') as user_messages,
        COUNT(*) FILTER (WHERE c.role = 'assistant') as ai_responses
      FROM "Conversations" c
      JOIN "Users" u ON u.id = c."userId"
      WHERE c."createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY c."userId", u."firstName", u."lastName", u."isPremium"
      ORDER BY message_count DESC
      LIMIT 10
    `);
    
    console.table(topUsers);

    // 7. Estimated Token Savings
    console.log('\n7️⃣  Estimated Token & Cost Savings');
    console.log('-'.repeat(60));
    
    const [totalMessages] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM "Conversations"
      WHERE role = 'user'
        AND "createdAt" >= NOW() - INTERVAL '7 days'
    `);
    
    const messageCount = totalMessages[0]?.total || 0;
    
    // Estimate savings based on intent distribution
    const intentSavings = {
      casual_chat: 0.93,
      profile_building: 0.87,
      finding_matches: 0.66,
      exploring_events: 0.64,
      unknown: 0.70
    };
    
    let totalSavings = 0;
    intentStats.forEach(stat => {
      const intent = stat.intent || 'unknown';
      const saving = intentSavings[intent] || 0.70;
      totalSavings += (stat.count * saving);
    });
    
    const avgSavingPercent = (totalSavings / messageCount) * 100;
    
    const oldTokensPerMsg = 1125;  // Old: ~625 prompt + 500 response
    const newTokensPerMsg = 625;   // New: ~125 prompt + 500 response
    const tokensSaved = messageCount * (oldTokensPerMsg - newTokensPerMsg);
    
    // GPT-4 Turbo pricing (approximate)
    const costPer1kTokens = 0.01; // $0.01 per 1k tokens
    const costSaved = (tokensSaved / 1000) * costPer1kTokens;
    
    console.log(`Total messages (7 days):     ${messageCount.toLocaleString()}`);
    console.log(`Average token savings:        ${avgSavingPercent.toFixed(1)}%`);
    console.log(`Tokens saved:                 ${tokensSaved.toLocaleString()}`);
    console.log(`Cost saved (7 days):          $${costSaved.toFixed(2)}`);
    console.log(`Projected monthly savings:    $${(costSaved * 4.3).toFixed(2)}`);
    console.log(`Projected yearly savings:     $${(costSaved * 52).toFixed(2)}`);

    // 8. Recommendations Performance
    console.log('\n8️⃣  Recommendation Performance');
    console.log('-'.repeat(60));
    
    const [recStats] = await sequelize.query(`
      SELECT 
        metadata->>'intent' as intent,
        metadata->>'responseType' as response_type,
        COUNT(*) as recommendation_count,
        AVG((metadata->>'recommendationCount')::int) as avg_items_recommended,
        MIN((metadata->>'recommendationCount')::int) as min_items,
        MAX((metadata->>'recommendationCount')::int) as max_items
      FROM "Conversations"
      WHERE role = 'assistant'
        AND metadata->>'responseType' IN ('profile_list', 'event_list')
        AND metadata->>'recommendationCount' IS NOT NULL
        AND "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY metadata->>'intent', metadata->>'responseType'
    `);
    
    console.table(recStats);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('Error analyzing AI usage:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  analyzeAIUsage()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { analyzeAIUsage };

