import mongoose from 'mongoose';
import Quest from './src/models/Quest.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function repairUserQuestAssociations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskquest');
    console.log('🔗 Connected to MongoDB');

    // Get all quests
    const quests = await Quest.find({});
    console.log(`📊 Found ${quests.length} quests in the database`);

    // Get all users
    const users = await User.find({});
    console.log(`👥 Found ${users.length} users in the database`);

    if (quests.length === 0) {
      console.log('⚠️ No quests found. Nothing to repair.');
      return;
    }

    if (users.length === 0) {
      console.log('⚠️ No users found. Nothing to repair.');
      return;
    }

    let repaired = 0;

    // For each user, ensure they're associated with at least one quest
    for (const user of users) {
      const userQuestIds = user.questsIn || [];
      
      if (userQuestIds.length === 0) {
        console.log(`🔧 User ${user.username} has no quests. Adding to first available quest...`);
        
        const firstQuest = quests[0];
        
        // Add user to quest members
        if (!firstQuest.members.some(memberId => memberId.toString() === user._id.toString())) {
          await Quest.findByIdAndUpdate(
            firstQuest._id,
            { $addToSet: { members: user._id } }
          );
          console.log(`  ✅ Added ${user.username} to quest "${firstQuest.title}" members`);
        }
        
        // Add quest to user's questsIn
        await User.findByIdAndUpdate(
          user._id,
          { $addToSet: { questsIn: firstQuest._id } }
        );
        console.log(`  ✅ Added quest "${firstQuest.title}" to ${user.username}'s questsIn`);
        
        repaired++;
      } else {
        console.log(`✓ User ${user.username} is already associated with ${userQuestIds.length} quest(s)`);
      }
    }

    // Verify each quest has proper members
    for (const quest of quests) {
      const questMembers = quest.members || [];
      
      if (questMembers.length === 0) {
        console.log(`🔧 Quest "${quest.title}" has no members. Adding all users...`);
        
        const allUserIds = users.map(u => u._id);
        await Quest.findByIdAndUpdate(
          quest._id,
          { $set: { members: allUserIds } }
        );
        
        // Update all users to include this quest
        await User.updateMany(
          {},
          { $addToSet: { questsIn: quest._id } }
        );
        
        console.log(`  ✅ Added all ${users.length} users to quest "${quest.title}"`);
      }
    }

    console.log(`\n🎉 Repair completed! Fixed ${repaired} user(s) with missing quest associations.`);

    // Show final state
    console.log('\n📊 Final State:');
    
    const updatedQuests = await Quest.find({}).populate('members', 'username');
    updatedQuests.forEach((quest, index) => {
      console.log(`\n🎯 Quest ${index + 1}: ${quest.title}`);
      console.log(`   Members: ${quest.members.map(m => m.username).join(', ')}`);
      console.log(`   Invite Code: ${quest.inviteCode}`);
    });

    const updatedUsers = await User.find({}).populate('questsIn', 'title');
    updatedUsers.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}: ${user.username}`);
      console.log(`   Quests: ${user.questsIn.map(q => q.title).join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Repair failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run repair
repairUserQuestAssociations();
