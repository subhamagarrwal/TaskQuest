import User from '../../models/User.js';
import Task from '../../models/Task.js';

export default async function tasksCommand(ctx) {
  const telegramUserId = ctx.from.id;

  try {
    // Check if user is linked
    const user = await User.findOne({ telegramId: telegramUserId.toString() });
    
    if (!user || !user.telegramLinked) {
      const message = `📋 *Your Tasks*

🔗 To view your tasks, you need to authenticate with a quest code first.

Please use: \`/auth <quest-code>\`

Get your quest code from your admin or TaskQuest dashboard.`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
      return;
    }

    // Fetch user's tasks
    const tasks = await Task.find({ assignedTo: user._id })
      .populate('quest', 'title')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    if (tasks.length === 0) {
      await ctx.reply('📝 No tasks assigned to you at the moment.');
      return;
    }

    let message = `📋 *Your Tasks (${tasks.length})*\n\n`;
    
    const inlineKeyboard = [];
    
    tasks.forEach((task, index) => {
      const status = task.completed ? '✅' : '⏳';
      const priority = task.priority === 'HIGH' ? '🔴' : task.priority === 'MEDIUM' ? '🟡' : '🟢';
      
      message += `${status} *Task ${index + 1}:* ${task.title}\n`;
      message += `${priority} Priority: ${task.priority}\n`;
      message += `📖 ${task.description}\n`;
      message += `🎯 Quest: ${task.quest?.title || 'No quest'}\n`;
      message += `👤 Created by: ${task.createdBy?.username || 'Unknown'}\n`;
      if (task.dueDate) {
        message += `📅 Due: ${new Date(task.dueDate).toLocaleDateString()}\n`;
      }
      message += `\n`;

      // Add completion button for incomplete tasks
      if (!task.completed) {
        inlineKeyboard.push([{
          text: `✅ Complete Task ${index + 1}`,
          callback_data: `complete_${task._id}`
        }]);
      }
    });

    message += '\n💡 Type "task X done" to complete task number X';

    await ctx.reply(message, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });

  } catch (error) {
    console.error('Error in tasks command:', error);
    await ctx.reply('❌ Sorry, there was an error fetching your tasks. Please try again later.');
  }
}