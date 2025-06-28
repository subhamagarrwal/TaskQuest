import mongoose from 'mongoose';
import Quest from './src/models/Quest.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkDatabaseState() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskquest');
    console.log('🔗 Connected to MongoDB');

    // Check quests
    const quests = await Quest.find({});
    console.log(`\n📊 Database State:`);
    console.log(`🎯 Total Quests: ${quests.length}`);
    
    if (quests.length > 0) {
      quests.forEach((quest, index) => {
        console.log(`\n  Quest ${index + 1}:`);
        console.log(`    Title: ${quest.title}`);
        console.log(`    ID: ${quest._id}`);
        console.log(`    Creator: ${quest.creator}`);
        console.log(`    Members: ${quest.members?.length || 0} members`);
        console.log(`    Invite Code: ${quest.inviteCode || 'NONE'}`);
        console.log(`    Active: ${quest.isActive}`);
      });
    }

    // Check users
    const users = await User.find({});
    console.log(`\n👥 Total Users: ${users.length}`);
    
    if (users.length > 0) {
      users.forEach((user, index) => {
        console.log(`\n  User ${index + 1}:`);
        console.log(`    Username: ${user.username}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Role: ${user.role}`);
        console.log(`    QuestsIn: ${user.questsIn?.length || 0} quests`);
        if (user.questsIn?.length > 0) {
          console.log(`    Quest IDs: ${user.questsIn.join(', ')}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run check
checkDatabaseState();
