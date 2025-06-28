import User from '../../models/User.js';
import Quest from '../../models/Quest.js';

export default async function authCommand(ctx) {
    const args = ctx.message.text.split(' ');
    const questCode = args[1]; // Get the quest code from command

    if (!questCode) {
        await ctx.reply(
            '🔑 *Quest Authentication*\n\n' +
            'Please provide a quest code to join.\n\n' +
            '**Usage:** `/auth <quest-code>`\n\n' +
            '**Example:** `/auth QUEST123`\n\n' +
            '💡 Get your quest code from your quest admin or TaskQuest dashboard.',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    try {
        // Show processing message
        const processingMsg = await ctx.reply('🔄 Processing your quest code...');

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
            await ctx.editMessageText(
                '❌ *Invalid Quest Code*\n\n' +
                'The quest code you provided is either:\n' +
                '• Invalid or expired\n' +
                '• Quest is no longer active\n\n' +
                'Please check with your quest admin for a valid code.',
                { 
                    message_id: processingMsg.message_id,
                    parse_mode: 'Markdown' 
                }
            );
            return;
        }

        // Check if quest is full
        if (quest.maxMembers && quest.members.length >= quest.maxMembers) {
            await ctx.editMessageText(
                '🚫 *Quest Full*\n\n' +
                `The quest "${quest.title}" has reached its maximum capacity of ${quest.maxMembers} members.\n\n` +
                'Please contact the quest admin for assistance.',
                { 
                    message_id: processingMsg.message_id,
                    parse_mode: 'Markdown' 
                }
            );
            return;
        }

        const telegramUser = ctx.from;
        
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

        // Success message
        const successMessage = `
✅ *Successfully Joined Quest!*

🎯 **Quest:** ${quest.title}
📝 **Description:** ${quest.description}
👑 **Created by:** ${quest.creator.username}
👥 **Members:** ${quest.members.length}${quest.maxMembers ? `/${quest.maxMembers}` : ''}

${isNewUser ? '🆕 **New account created!**\n' : ''}🔗 **Your Telegram account is now linked!**

**What's next?**
• Use /tasks to view your assigned tasks
• Wait for task assignments from your quest admin
• Complete tasks by typing "task X done"

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
        await notifyQuestAdmin(quest, user, isNewUser);

    } catch (error) {
        console.error('Error in auth command:', error);
        await ctx.reply(
            '❌ **Error**\n\n' +
            'Something went wrong while processing your request.\n' +
            'Please try again later or contact support.',
            { parse_mode: 'Markdown' }
        );
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
                await bot.telegram.sendMessage(admin.telegramId, message, { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '📊 View Quest Dashboard', url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/dashboard` }
                        ]]
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error notifying quest admin:', error);
    }
}
