// Script to find and fix duplicate telegramId issues
// Run this with: node fix-duplicate-telegram.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function fixDuplicateTelegramIds() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all users with telegramId
        const usersWithTelegram = await User.find({ 
            telegramId: { $exists: true, $ne: null } 
        }).select('_id username email telegramId telegramUsername telegramLinked questsIn');

        console.log(`\n📊 Found ${usersWithTelegram.length} users with Telegram IDs`);

        // Group by telegramId to find duplicates
        const telegramIdMap = new Map();
        
        for (const user of usersWithTelegram) {
            const telegramId = user.telegramId;
            if (!telegramIdMap.has(telegramId)) {
                telegramIdMap.set(telegramId, []);
            }
            telegramIdMap.get(telegramId).push(user);
        }

        // Find duplicates
        const duplicates = [];
        for (const [telegramId, users] of telegramIdMap.entries()) {
            if (users.length > 1) {
                duplicates.push({ telegramId, users });
            }
        }

        if (duplicates.length === 0) {
            console.log('\n✅ No duplicate Telegram IDs found!');
        } else {
            console.log(`\n⚠️  Found ${duplicates.length} duplicate Telegram IDs:\n`);
            
            for (const { telegramId, users } of duplicates) {
                console.log(`\n🔍 Telegram ID: ${telegramId}`);
                console.log('   Linked to multiple users:');
                
                users.forEach((user, index) => {
                    console.log(`\n   ${index + 1}. User ID: ${user._id}`);
                    console.log(`      Username: ${user.username}`);
                    console.log(`      Email: ${user.email}`);
                    console.log(`      Telegram Username: ${user.telegramUsername || 'N/A'}`);
                    console.log(`      Telegram Linked: ${user.telegramLinked}`);
                    console.log(`      Quests: ${user.questsIn.length}`);
                });

                console.log('\n   🔧 FIX OPTIONS:');
                console.log('   Option 1: Keep the first user and unlink Telegram from others');
                console.log('   Option 2: Keep a specific user and unlink from others');
                console.log('   Option 3: Manually decide which user(s) to unlink\n');
            }

            // Auto-fix option: Keep first user, unlink others
            console.log('\n⚙️  AUTO-FIX: Keeping the first linked user and unlinking Telegram from duplicate accounts...\n');
            
            for (const { telegramId, users } of duplicates) {
                const [keepUser, ...unlinkUsers] = users;
                
                console.log(`✅ Keeping Telegram ID ${telegramId} linked to: ${keepUser.username} (${keepUser._id})`);
                
                for (const user of unlinkUsers) {
                    user.telegramId = null;
                    user.telegramUsername = null;
                    user.telegramLinked = false;
                    await user.save();
                    console.log(`   🔓 Unlinked from: ${user.username} (${user._id})`);
                }
            }

            console.log('\n✅ Duplicate Telegram IDs fixed!');
        }

        // Show users without Telegram IDs that have linkCodes
        const usersWithLinkCodes = await User.find({
            linkCode: { $exists: true, $ne: null },
            telegramLinked: false
        }).select('_id username linkCode linkCodeExpires');

        if (usersWithLinkCodes.length > 0) {
            console.log(`\n📋 Users waiting to link Telegram (${usersWithLinkCodes.length}):`);
            usersWithLinkCodes.forEach(user => {
                const expired = user.linkCodeExpires && user.linkCodeExpires < new Date();
                console.log(`   • ${user.username}: ${user.linkCode} ${expired ? '(EXPIRED)' : ''}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

// Run the script
fixDuplicateTelegramIds();
