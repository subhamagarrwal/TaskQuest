// Database Migration Script - Remove Unique Index from Task.quest field
// Run this script to fix the duplicate key error when creating tasks

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function removeUniqueIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb://127.0.0.1:27017/taskquest");
    console.log('✅ Connected to MongoDB for migration');

    // Get the tasks collection
    const db = mongoose.connection.db;
    const tasksCollection = db.collection('tasks');

    // List all indexes on tasks collection
    console.log('📋 Current indexes on tasks collection:');
    const indexes = await tasksCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });

    // Check if quest_1 unique index exists
    const questIndex = indexes.find(index => index.name === 'quest_1');
    
    if (questIndex) {
      console.log('🔍 Found unique index on quest field:', questIndex);
      
      // Drop the unique index
      await tasksCollection.dropIndex('quest_1');
      console.log('✅ Successfully dropped unique index on quest field');
    } else {
      console.log('ℹ️ No unique index found on quest field');
    }

    // List indexes after removal
    console.log('📋 Indexes after migration:');
    const newIndexes = await tasksCollection.indexes();
    newIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });

    // Close connection
    await mongoose.disconnect();
    console.log('✅ Migration completed successfully');
    console.log('🎯 You can now create multiple tasks per quest');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
removeUniqueIndex();
