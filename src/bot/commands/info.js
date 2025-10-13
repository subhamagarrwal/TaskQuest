import User from '../../models/User.js';
import Quest from '../../models/Quest.js';
import Task from '../../models/Task.js';

export default async function infoCommand(ctx) {
    const telegramId = ctx.from.id.toString();
    const telegramUsername = ctx.from.username || ctx.from.first_name;
    
    try {
        // Find user by Telegram ID
        const user = await User.findOne({ telegramId }).populate('questsIn');
        
        if (!user || !user.telegramLinked) {
            await ctx.reply(
                '🔐 *Not Authenticated*\n\n' +
                'You need to authenticate first to view your profile.\n\n' +
                'Use `/auth <code>` with your authentication code.',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Get user's tasks
        const tasks = await Task.find({ 
            assignedTo: user._id 
        }).populate('quest', 'title description');

        // Get quests where user is admin (creator)
        const adminQuests = await Quest.find({ 
            creator: user._id,
            isActive: true 
        }).populate('members', 'username telegramLinked');

        // Build profile information
        let profileMessage = `
� **${user.username}'s Profile**

🎭 **Role:** ${user.role}
🔗 **Telegram:** ${user.telegramLinked ? '✅ Linked' : '❌ Not linked'}
⭐ **Performance Score:** ${user.performanceScore || 0}
📅 **Member since:** ${new Date(user.createdAt).toLocaleDateString()}
`;

        // Show quest memberships
        if (user.questsIn && user.questsIn.length > 0) {
            profileMessage += `\n🎯 **Quests (${user.questsIn.length}):**\n`;
            user.questsIn.forEach((quest, index) => {
                profileMessage += `${index + 1}. ${quest.title}\n`;
            });
        }

        // Show admin information if user is admin
        if (user.role === 'ADMIN' && adminQuests.length > 0) {
            profileMessage += `\n👑 **Managing Quests (${adminQuests.length}):**\n`;
            adminQuests.forEach((quest, index) => {
                const linkedMembers = quest.members.filter(m => m.telegramLinked).length;
                profileMessage += `${index + 1}. **${quest.title}**\n`;
                profileMessage += `   � ${quest.members.length} members (${linkedMembers} on Telegram)\n`;
            });
        }

        // Show tasks information
        if (tasks.length > 0) {
            const completedTasks = tasks.filter(task => task.status === 'completed').length;
            const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
            const notStartedTasks = tasks.filter(task => task.status === 'not_started').length;
            
            profileMessage += `\n📋 **Task Summary:**\n`;
            profileMessage += `✅ Completed: ${completedTasks}\n`;
            profileMessage += `🔄 In Progress: ${inProgressTasks}\n`;
            profileMessage += `⏳ Not Started: ${notStartedTasks}\n`;
            profileMessage += `📊 Total: ${tasks.length}\n`;

            // Show recent tasks (last 3)
            const recentTasks = tasks
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .slice(0, 3);
            
            if (recentTasks.length > 0) {
                profileMessage += `\n📝 **Recent Tasks:**\n`;
                recentTasks.forEach((task, index) => {
                    const statusEmoji = {
                        'completed': '✅',
                        'in_progress': '🔄',
                        'not_started': '⏳'
                    };
                    profileMessage += `${index + 1}. ${statusEmoji[task.status]} ${task.title}\n`;
                    if (task.quest) {
                        profileMessage += `   📁 ${task.quest.title}\n`;
                    }
                });
            }
        } else if (user.role === 'USER') {
            profileMessage += `\n📋 **Tasks:** No tasks assigned yet\n`;
        }

        // Add helpful commands
        profileMessage += `\n💡 **Quick Actions:**\n`;
        if (user.role === 'ADMIN') {
            profileMessage += `• /tasks - View admin dashboard\n`;
            
            // Only show dashboard link if we have a valid public URL
            const dashboardUrl = process.env.FRONTEND_URL;
            if (dashboardUrl && !dashboardUrl.includes('localhost')) {
                profileMessage += `• [Dashboard](${dashboardUrl}/dashboard) - Manage quests\n`;
            }
        } else {
            profileMessage += `• /tasks - View your tasks\n`;
        }
        profileMessage += `• /help - Available commands\n`;

        // Build inline keyboard
        const keyboard = [[{ text: '📋 View Tasks', callback_data: 'view_tasks' }]];
        
        // Only add dashboard URL button if we have a valid public URL (not localhost)
        const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
        if (user.role === 'ADMIN' && dashboardUrl && !dashboardUrl.includes('localhost')) {
            keyboard.push([{ 
                text: '🎯 Quest Dashboard', 
                url: `${dashboardUrl}/dashboard` 
            }]);
        }

        await ctx.reply(profileMessage, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
        
    } catch (error) {
        console.error('Error fetching user profile:', error);
        console.error('Error stack:', error.stack);
        await ctx.reply(
            '❌ **Error**\n\n' +
            'There was an error fetching your profile information.\n' +
            'Please try again later.',
            { parse_mode: 'Markdown' }
        );
    }
}
