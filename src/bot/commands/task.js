import User from '../../models/User.js';
import Task from '../../models/Task.js';

export default async function taskCommand(ctx) {
    const taskNumber = ctx.message.text.split(' ')[1];
    const telegramUserId = ctx.from.id;
    
    if (!taskNumber) {
        await ctx.reply(
            '❓ *Task Details*\n\nPlease specify a task number.\n\nUsage: `/task <number>`\n\nExample: `/task 1`',
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    try {
        // Check if user is linked
        const user = await User.findOne({ telegramId: telegramUserId.toString() });
        
        if (!user || !user.telegramLinked) {
            const message = `📝 *Task ${taskNumber} Details*

🔗 To view task details, you need to authenticate with a quest code first.

Please use: \`/auth <quest-code>\`

Get your quest code from your admin.`;

            await ctx.reply(message, { parse_mode: 'Markdown' });
            return;
        }

        // Fetch user's tasks
        const tasks = await Task.find({ assignedTo: user._id })
            .populate('quest', 'title description')
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 });

        const taskIndex = parseInt(taskNumber) - 1;
        
        if (!tasks || taskIndex < 0 || taskIndex >= tasks.length) {
            await ctx.reply('❌ Task not found. Use /tasks to see your available tasks.');
            return;
        }
        
        const task = tasks[taskIndex];
        const statusEmoji = task.completed ? '✅' : '⏳';
        
        const detailMessage = `
${statusEmoji} *${task.title}*

📝 *Description:*
${task.description}

📊 *Status:* ${task.completed ? 'Completed' : 'Pending'}

📅 *Due Date:* ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline set'}

🎯 *Priority:* ${task.priority || 'Normal'}

📋 *Quest:* ${task.quest ? task.quest.title : 'No quest assigned'}

👤 *Created by:* ${task.createdBy ? task.createdBy.username : 'Unknown'}

💡 *Need help?* Type "task ${taskNumber} done" to mark as complete.
        `;
        
        const keyboard = task.completed ? [] : [[{
            text: `✅ Mark Task ${taskNumber} Complete`,
            callback_data: `complete_${task._id}`
        }]];
        
        await ctx.reply(detailMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: keyboard
            }
        });

    } catch (error) {
        console.error('Error in task command:', error);
        await ctx.reply('❌ Sorry, there was an error. Please try again later.');
    }
}
