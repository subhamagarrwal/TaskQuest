import User from '../../models/User.js';
import Quest from '../../models/Quest.js';

export default async function authCommand(ctx) {
    console.log('🔐 Auth command called');
    console.log('📄 Message:', ctx.message);
    console.log('👤 User:', ctx.from);
    
    if (!ctx.message || !ctx.message.text) {
        console.error('❌ No message text found in context');
        await ctx.reply('❌ Authentication error: No message text found.');
        return;
    }
    
    const args = ctx.message.text.split(' ');
    const authCode = args[1]; // Get the authentication code
    
    console.log('🔢 Args:', args);
    console.log('🔑 Auth code:', authCode);

    if (!authCode) {
        await ctx.reply(
            '🔑 *TaskQuest Authentication*\n\n' +
            'Please provide your authentication code to join.\n\n' +
            '**Usage:** `/auth <code>`\n\n' +
            '**Examples:**\n' +
            '• `/auth ADM123ABC` - Admin code\n' +
            '• `/auth USR456DEF` - User code\n\n' +
            '💡 Get your code from your quest admin or TaskQuest dashboard.',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    try {
        // Show processing message
        const processingMsg = await ctx.reply('🔄 Processing your authentication code...');

        const telegramUser = ctx.from;
        console.log('👤 Telegram user from ctx.from:', telegramUser);
        let authResult = null;

        // Check if it's an admin code (starts with ADM)
        if (authCode.startsWith('ADM')) {
            authResult = await authenticateAdmin(authCode, telegramUser);
        }
        // Check if it's a user code (starts with USR)
        else if (authCode.startsWith('USR')) {
            console.log('📤 Calling authenticateUser with:', { authCode, telegramUser });
            authResult = await authenticateUser(authCode, telegramUser);
        }
        // Legacy support - check if it's a quest invite code
        else {
            authResult = await authenticateLegacyQuest(authCode, telegramUser);
        }

        if (!authResult.success) {
            await ctx.editMessageText(
                `❌ *Authentication Failed*\n\n${authResult.message}`,
                { 
                    message_id: processingMsg.message_id,
                    parse_mode: 'Markdown' 
                }
            );
            return;
        }

        // Success message
        const successMessage = `
✅ *Successfully Authenticated!*

👤 **Welcome:** ${authResult.user.username}
🎭 **Role:** ${authResult.user.role}
🎯 **Quest:** ${authResult.quest.title}
📝 **Description:** ${authResult.quest.description}
👑 **Created by:** ${authResult.quest.creator.username}

${authResult.isNewUser ? '🆕 **New account created!**\n' : ''}🔗 **Your Telegram account is now linked!**

**What's next?**
${authResult.user.role === 'ADMIN' ? 
    '• Create and manage tasks\n• Assign tasks to team members\n• Monitor quest progress' : 
    '• Use /tasks to view your assigned tasks\n• Complete tasks to earn points\n• Stay updated on quest progress'
}

Welcome to TaskQuest! 🎉
        `;

        await ctx.editMessageText(successMessage, {
            message_id: processingMsg.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📋 View My Tasks', callback_data: 'view_tasks' }],
                    [{ text: '👤 View Profile', callback_data: 'view_profile' }]
                ]
            }
        });

        // Notify quest admin
        await notifyQuestAdmin(authResult.quest, authResult.user, authResult.isNewUser);

    } catch (error) {
        console.error('Error in auth command:', error);
        console.error('Error stack:', error.stack);
        await ctx.reply(
            '❌ **Error**\n\n' +
            `Something went wrong while processing your request: ${error.message}\n` +
            'Please try again later or contact support.',
            { parse_mode: 'Markdown' }
        );
    }
}

// Authenticate admin using admin code
async function authenticateAdmin(adminCode, telegramUser) {
    try {
        // Find quest by admin invite code
        const quest = await Quest.findOne({ 
            inviteCode: adminCode,
            isActive: true,
            $or: [
                { inviteCodeExpires: { $gt: new Date() } },
                { inviteCodeExpires: null }
            ]
        }).populate('creator', 'username');

        if (!quest) {
            return {
                success: false,
                message: 'Invalid or expired admin code.\nPlease check with your quest dashboard for a valid code.'
            };
        }

        // Find the quest creator (admin user)
        const adminUser = await User.findById(quest.creator._id);
        if (!adminUser) {
            return {
                success: false,
                message: 'Quest admin not found. Please contact support.'
            };
        }

        // Check if this Telegram account is already linked to another user
        const existingTelegramUser = await User.findOne({ 
            telegramId: telegramUser.id.toString(),
            _id: { $ne: adminUser._id } // Exclude current user
        });

        if (existingTelegramUser) {
            console.log(`⚠️ Telegram ID ${telegramUser.id} is already linked to user: ${existingTelegramUser.username}`);
            console.log(`🔄 Unlinking Telegram from previous user to allow re-authentication...`);
            
            // Unlink from previous user to allow re-authentication
            existingTelegramUser.telegramId = null;
            existingTelegramUser.telegramUsername = null;
            existingTelegramUser.telegramLinked = false;
            await existingTelegramUser.save();
            
            console.log(`✅ Telegram unlinked from ${existingTelegramUser.username}`);
        }

        // If admin user is already linked to a different Telegram account, unlink it
        if (adminUser.telegramLinked && adminUser.telegramId && adminUser.telegramId !== telegramUser.id.toString()) {
            console.log(`⚠️ Admin ${adminUser.username} was linked to Telegram ID: ${adminUser.telegramId}`);
            console.log(`🔄 Switching to new Telegram account...`);
        }

        // Link Telegram account to admin user
        adminUser.telegramId = telegramUser.id.toString();
        adminUser.telegramUsername = telegramUser.username;
        adminUser.telegramLinked = true;
        await adminUser.save();

        return {
            success: true,
            user: adminUser,
            quest: quest,
            isNewUser: false
        };

    } catch (error) {
        console.error('Error authenticating admin:', error);
        return {
            success: false,
            message: 'Authentication error. Please try again.'
        };
    }
}

// Authenticate user using user code
async function authenticateUser(userCode, telegramUser) {
    try {
        console.log(`🔍 Looking for user with code: ${userCode}`);
        
        // Find user by link code
        const user = await User.findOne({ 
            linkCode: userCode,
            $or: [
                { linkCodeExpires: { $gt: new Date() } },
                { linkCodeExpires: null }
            ]
        });

        console.log(`👤 User found:`, user ? { id: user._id, username: user.username, questsIn: user.questsIn } : null);

        if (!user) {
            return {
                success: false,
                message: 'Invalid or expired user code.\nPlease check with your admin for a valid code.'
            };
        }

        // Find the quest this user belongs to
        const questId = user.questsIn && user.questsIn.length > 0 ? user.questsIn[0] : null;
        console.log(`🎯 Quest ID for user:`, questId);
        
        if (!questId) {
            return {
                success: false,
                message: 'No quest found for this user. Please contact your admin.'
            };
        }

        const quest = await Quest.findById(questId).populate('creator', 'username');
        console.log(`🏴 Quest found:`, quest ? { id: quest._id, title: quest.title, isActive: quest.isActive } : null);
        
        if (!quest || !quest.isActive) {
            return {
                success: false,
                message: 'Quest not found or inactive. Please contact your admin.'
            };
        }

        // Check if this Telegram account is already linked to another user
        const existingTelegramUser = await User.findOne({ 
            telegramId: telegramUser.id.toString(),
            _id: { $ne: user._id } // Exclude current user
        });

        if (existingTelegramUser) {
            console.log(`⚠️ Telegram ID ${telegramUser.id} is already linked to user: ${existingTelegramUser.username}`);
            console.log(`🔄 Unlinking Telegram from previous user to allow re-authentication...`);
            
            // Unlink from previous user to allow re-authentication
            existingTelegramUser.telegramId = null;
            existingTelegramUser.telegramUsername = null;
            existingTelegramUser.telegramLinked = false;
            await existingTelegramUser.save();
            
            console.log(`✅ Telegram unlinked from ${existingTelegramUser.username}`);
        }

        // If user is already linked to a different Telegram account, unlink it
        if (user.telegramLinked && user.telegramId && user.telegramId !== telegramUser.id.toString()) {
            console.log(`⚠️ User ${user.username} was linked to Telegram ID: ${user.telegramId}`);
            console.log(`🔄 Switching to new Telegram account...`);
        }

        // Link Telegram account to user
        user.telegramId = telegramUser.id.toString();
        user.telegramUsername = telegramUser.username;
        user.telegramLinked = true;
        
        // Clear the link code after successful authentication
        user.linkCode = null;
        user.linkCodeExpires = null;
        
        console.log(`✅ Attempting to save user with telegramId: ${user.telegramId}`);
        await user.save();
        console.log(`✅ User saved successfully!`);

        return {
            success: true,
            user: user,
            quest: quest,
            isNewUser: false
        };

    } catch (error) {
        console.error('Error authenticating user:', error);
        return {
            success: false,
            message: 'Authentication error. Please try again.'
        };
    }
}

// Legacy authentication for older quest codes
async function authenticateLegacyQuest(questCode, telegramUser) {
    try {
        // Find quest by invite code
        const quest = await Quest.findOne({ 
            inviteCode: questCode,
            isActive: true,
            $or: [
                { inviteCodeExpires: { $gt: new Date() } },
                { inviteCodeExpires: null }
            ]
        }).populate('creator', 'username');

        if (!quest) {
            return {
                success: false,
                message: 'Invalid or expired quest code.\nPlease check with your quest admin for a valid code.'
            };
        }

        // Check if quest is full
        if (quest.maxMembers && quest.members.length >= quest.maxMembers) {
            return {
                success: false,
                message: `Quest "${quest.title}" has reached its maximum capacity of ${quest.maxMembers} members.\nPlease contact the quest admin for assistance.`
            };
        }

        // Check if user already exists
        let user = await User.findOne({ 
            $or: [
                { telegramId: telegramUser.id.toString() },
                { telegramUsername: telegramUser.username }
            ]
        });

        let isNewUser = false;

        if (!user) {
            // Create new user account
            isNewUser = true;
            user = new User({
                username: telegramUser.username || `user_${telegramUser.id}`,
                email: `${telegramUser.id}@telegram.temp`, // Temporary email
                phone: telegramUser.phone_number || null,
                role: 'USER',
                telegramId: telegramUser.id.toString(),
                telegramUsername: telegramUser.username,
                telegramLinked: true,
                questsIn: [quest._id]
            });
            await user.save();
        } else {
            // Check if this Telegram ID is already linked to another user
            const existingTelegramUser = await User.findOne({ 
                telegramId: telegramUser.id.toString(),
                _id: { $ne: user._id } // Exclude current user
            });

            if (existingTelegramUser) {
                console.log(`⚠️ Telegram ID ${telegramUser.id} is already linked to user: ${existingTelegramUser.username}`);
                console.log(`🔄 Unlinking Telegram from previous user to allow re-authentication...`);
                
                // Unlink from previous user to allow re-authentication
                existingTelegramUser.telegramId = null;
                existingTelegramUser.telegramUsername = null;
                existingTelegramUser.telegramLinked = false;
                await existingTelegramUser.save();
                
                console.log(`✅ Telegram unlinked from ${existingTelegramUser.username}`);
            }

            // If user is already linked to a different Telegram account, allow switching
            if (user.telegramLinked && user.telegramId && user.telegramId !== telegramUser.id.toString()) {
                console.log(`⚠️ User ${user.username} was linked to Telegram ID: ${user.telegramId}`);
                console.log(`🔄 Switching to new Telegram account...`);
            }

            // Update existing user with Telegram info
            user.telegramId = telegramUser.id.toString();
            user.telegramUsername = telegramUser.username;
            user.telegramLinked = true;
            
            // Add to quest if not already a member
            if (!user.questsIn.includes(quest._id)) {
                user.questsIn.push(quest._id);
            }
            await user.save();
        }

        // Add user to quest if not already a member
        if (!quest.members.includes(user._id)) {
            quest.members.push(user._id);
            await quest.save();
        }

        return {
            success: true,
            user: user,
            quest: quest,
            isNewUser: isNewUser
        };

    } catch (error) {
        console.error('Error in legacy quest authentication:', error);
        return {
            success: false,
            message: 'Authentication error. Please try again.'
        };
    }
}

async function notifyQuestAdmin(quest, newUser, isNewUser) {
    try {
        const admin = await User.findById(quest.creator);
        
        if (admin && admin.telegramLinked && admin.telegramId) {
            const message = `
🆕 **New Quest Member!**

👤 **User:** ${newUser.username}
🎯 **Quest:** ${quest.title}
🔗 **Via:** Telegram Bot
${isNewUser ? '✨ **New TaskQuest account created**' : '👋 **Existing user joined**'}

**Quest Stats:**
👥 Members: ${quest.members.length}${quest.maxMembers ? `/${quest.maxMembers}` : ''}
📅 Joined: ${new Date().toLocaleString()}
            `;

            // Import bot instance
            const { getBotInstance } = await import('../index.js');
            const bot = getBotInstance();
            if (bot) {
                const messageOptions = { parse_mode: 'Markdown' };
                
                // Only add inline keyboard if FRONTEND_URL is set and not localhost
                if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
                    messageOptions.reply_markup = {
                        inline_keyboard: [[
                            { text: '📊 View Quest Dashboard', url: `${process.env.FRONTEND_URL}/dashboard` }
                        ]]
                    };
                }
                
                await bot.telegram.sendMessage(admin.telegramId, message, messageOptions);
            }
        }
    } catch (error) {
        console.error('Error notifying quest admin:', error);
    }
}
