import mongoose from 'mongoose';
import Quest from './src/models/Quest.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrateInviteCodes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskquest');
    console.log('🔗 Connected to MongoDB');

    // Find quests without invite codes
    const questsWithoutCodes = await Quest.find({ 
      $or: [
        { inviteCode: { $exists: false } },
        { inviteCode: null },
        { inviteCode: '' }
      ]
    });

    console.log(`📊 Found ${questsWithoutCodes.length} quests without invite codes`);

    let updated = 0;
    for (const quest of questsWithoutCodes) {
      // Generate unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Update quest
      quest.inviteCode = inviteCode;
      quest.isActive = quest.isActive !== undefined ? quest.isActive : true;
      
      await quest.save();
      updated++;
      
      console.log(`✅ Generated invite code ${inviteCode} for quest: ${quest.title}`);
    }

    console.log(`🎉 Migration completed! Updated ${updated} quests with invite codes.`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrateInviteCodes();
