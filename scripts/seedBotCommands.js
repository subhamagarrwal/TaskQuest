import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// BotCommand Schema (inline definition to avoid import issues)
const botCommandSchema = new mongoose.Schema({
    command: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    responseMessage: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    category: {
        type: String,
        enum: ['AUTH', 'TASK_MANAGEMENT', 'INFO', 'UTILITY'],
        default: 'UTILITY'
    },
    parameters: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

const BotCommand = mongoose.model('BotCommand', botCommandSchema);

// Default bot commands data
const defaultBotCommands = [
  {
    command: '/start',
    description: 'Start the bot and show welcome message',
    responseMessage: 'Welcome to TaskQuest! 🎮\n\nI\'m your quest companion. Use /help to see available commands.',
    isActive: true,
    category: 'AUTH',
    parameters: ''
  },
  {
    command: '/help',
    description: 'Show available commands',
    responseMessage: 'Available Commands:\n\n/start - Start the bot\n/auth - Link your account\n/tasks - View your tasks\n/info - Get quest info\n/about - About TaskQuest',
    isActive: true,
    category: 'INFO',
    parameters: ''
  },
  {
    command: '/auth',
    description: 'Link Telegram account with TaskQuest',
    responseMessage: 'To link your account, please visit: [FRONTEND_URL]/auth/telegram\n\nUse your quest credentials to connect.',
    isActive: true,
    category: 'AUTH',
    parameters: ''
  },
  {
    command: '/tasks',
    description: 'View your current tasks',
    responseMessage: 'Here are your current tasks:\n\n[TASK_LIST]\n\nUse the web dashboard for detailed task management.',
    isActive: true,
    category: 'TASK_MANAGEMENT',
    parameters: ''
  },
  {
    command: '/info',
    description: 'Get information about current quest',
    responseMessage: 'Quest Information:\n\n[QUEST_INFO]\n\nVisit the dashboard for more details.',
    isActive: true,
    category: 'INFO',
    parameters: ''
  },
  {
    command: '/about',
    description: 'About TaskQuest',
    responseMessage: 'TaskQuest 🎮\n\nA gamified task management system that transforms your workflow into epic quests!\n\nFeatures:\n• Quest-based task organization\n• XP and leveling system\n• Team collaboration\n• Progress tracking\n\nVisit: [FRONTEND_URL]',
    isActive: true,
    category: 'INFO',
    parameters: ''
  },
  {
    command: '/update',
    description: 'Update task status',
    responseMessage: 'To update tasks, please use the web dashboard at [FRONTEND_URL]\n\nFor quick updates, describe your progress and I\'ll help you!',
    isActive: true,
    category: 'TASK_MANAGEMENT',
    parameters: 'task_id, status'
  },
  {
    command: '/leave',
    description: 'Leave current quest',
    responseMessage: 'Are you sure you want to leave the current quest?\n\nThis action cannot be undone. Please confirm in the web dashboard.',
    isActive: true,
    category: 'TASK_MANAGEMENT',
    parameters: ''
  }
];

async function seedBotCommands() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
    });
    console.log('✅ Connected to MongoDB Atlas');

    // Clear existing bot commands
    console.log('🗑️ Clearing existing bot commands...');
    await BotCommand.deleteMany({});
    console.log('✅ Cleared existing bot commands');

    // Insert new bot commands
    console.log('📝 Seeding bot commands...');
    const insertedCommands = await BotCommand.insertMany(defaultBotCommands);
    
    console.log(`✅ Successfully seeded ${insertedCommands.length} bot commands:`);
    insertedCommands.forEach(cmd => {
      console.log(`   • ${cmd.command} (${cmd.category})`);
    });

    console.log('\n🎉 Bot commands seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding bot commands:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    process.exit(0);
  }
}

// Export function for use in other scripts
export { defaultBotCommands, seedBotCommands };

// Run seeding if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🌱 Starting BotCommand seeding process...');
  seedBotCommands();
}
