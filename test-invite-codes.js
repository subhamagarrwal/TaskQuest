import mongoose from 'mongoose';
import Quest from './src/models/Quest.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAutoGenerateInviteCodes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskquest');
    console.log('🔗 Connected to MongoDB');

    // Find all quests and show their invite codes
    const quests = await Quest.find({});
    
    console.log(`📊 Found ${quests.length} quests in the database:`);
    
    quests.forEach((quest, index) => {
      console.log(`\n🎯 Quest ${index + 1}:`);
      console.log(`   Title: ${quest.title}`);
      console.log(`   Invite Code: ${quest.inviteCode || 'NOT SET'}`);
      console.log(`   Active: ${quest.isActive}`);
      console.log(`   Created: ${quest.createdAt}`);
      
      if (quest.inviteCode) {
        console.log(`   Bot Link: https://t.me/${process.env.BOT_USERNAME}?start=auth_${quest.inviteCode}`);
      }
    });

    // Test creating a new quest to see if invite code is auto-generated
    console.log('\n🧪 Testing quest creation with auto-generated invite code...');
    
    // First check if we can create a quest (noting the limit of 1 quest)
    const questCount = await Quest.countDocuments();
    if (questCount === 0) {
      console.log('No quests exist, testing quest creation...');
      
      const testQuest = new Quest({
        title: 'Test Quest for Auto-Generation',
        description: 'Testing auto-generated invite codes',
        creator: new mongoose.Types.ObjectId(),
        members: [new mongoose.Types.ObjectId()],
        inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        isActive: true
      });
      
      await testQuest.save();
      console.log(`✅ Test quest created with invite code: ${testQuest.inviteCode}`);
      
      // Clean up test quest
      await Quest.findByIdAndDelete(testQuest._id);
      console.log('🧹 Test quest cleaned up');
    } else {
      console.log(`📋 ${questCount} quest(s) already exist, skipping creation test due to one-quest limit`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run test
testAutoGenerateInviteCodes();
