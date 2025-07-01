import mongoose from 'mongoose';
import BotCommand from '../src/models/BotCommand.js';
import fs from 'fs';
import path from 'path';

async function exportLocalBotCommands() {
  try {
    console.log('🔗 Connecting to local MongoDB...');
    
    // Connect to local MongoDB
    await mongoose.connect("mongodb://127.0.0.1:27017/taskquest", {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to local MongoDB');

    // Export bot commands
    console.log('📤 Exporting bot commands from local database...');
    const botCommands = await BotCommand.find({}).lean();
    
    if (botCommands.length === 0) {
      console.log('⚠️ No bot commands found in local database');
      return;
    }

    // Remove MongoDB-specific fields
    const cleanCommands = botCommands.map(cmd => {
      const { _id, __v, createdAt, updatedAt, ...cleanCmd } = cmd;
      return cleanCmd;
    });

    // Save to file
    const exportPath = path.join(process.cwd(), 'scripts', 'exported-bot-commands.json');
    fs.writeFileSync(exportPath, JSON.stringify(cleanCommands, null, 2));
    
    console.log(`✅ Exported ${cleanCommands.length} bot commands to: ${exportPath}`);
    console.log('📋 Commands exported:');
    cleanCommands.forEach(cmd => {
      console.log(`   • ${cmd.command} (${cmd.category})`);
    });

    // Also create importable JS file
    const jsExportPath = path.join(process.cwd(), 'scripts', 'exported-bot-commands.js');
    const jsContent = `// Exported bot commands from local database
export const exportedBotCommands = ${JSON.stringify(cleanCommands, null, 2)};

export default exportedBotCommands;
`;
    fs.writeFileSync(jsExportPath, jsContent);
    console.log(`✅ Also created JS export file: ${jsExportPath}`);
    
  } catch (error) {
    console.error('❌ Error exporting bot commands:', error);
    if (error.name === 'MongoServerSelectionError') {
      console.log('💡 Make sure your local MongoDB is running on port 27017');
    }
  } finally {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    process.exit(0);
  }
}

// Run export if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportLocalBotCommands();
}

export default exportLocalBotCommands;
