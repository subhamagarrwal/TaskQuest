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
    }    // Fetch user's tasks - separate completed and incomplete
    const allTasks = await Task.find({ assignedTo: user._id })
      .populate('quest', 'title')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    const incompleteTasks = allTasks.filter(task => !task.completed && task.status !== 'completed');
    const completedTasks = allTasks.filter(task => task.completed || task.status === 'completed');

    // Special handling for admins
    if (allTasks.length === 0 && user.role === 'ADMIN') {
      // Show admin overview instead of "no tasks"
      const questTasks = await Task.find({ quest: { $in: user.questsIn } })
        .populate('assignedTo', 'username')
        .populate('quest', 'title');
      
      let message = `👑 *Admin Dashboard*\n\n`;
      
      if (questTasks.length === 0) {
        message += `📝 No tasks created yet in your quest.\n\n`;
        message += `💡 Create tasks via the TaskQuest dashboard and assign them to your team members.`;
      } else {
        const questTasksIncomplete = questTasks.filter(task => !task.completed && task.status !== 'completed');
        const questTasksCompleted = questTasks.filter(task => task.completed || task.status === 'completed');
        
        message += `📊 *Quest Overview:*\n`;
        message += `📝 Total Tasks: ${questTasks.length}\n`;
        message += `⏳ Pending: ${questTasksIncomplete.length}\n`;
        message += `✅ Completed: ${questTasksCompleted.length}\n`;
        message += `📈 Progress: ${Math.round((questTasksCompleted.length / questTasks.length) * 100)}%\n\n`;
        
        if (questTasksIncomplete.length > 0) {
          message += `🔥 *Recent Pending Tasks:*\n`;
          questTasksIncomplete.slice(0, 3).forEach((task, index) => {
            const priority = task.priority === 'HIGH' ? '🔴' : task.priority === 'MEDIUM' ? '🟡' : '🟢';
            message += `${priority} ${task.title}\n`;
            message += `👤 Assigned to: ${task.assignedTo?.username || 'Unassigned'}\n\n`;
          });
          
          if (questTasksIncomplete.length > 3) {
            message += `...and ${questTasksIncomplete.length - 3} more\n\n`;
          }
        }
        
        message += `💼 *As admin, you can:*\n`;
        message += `• Create new tasks via dashboard\n`;
        message += `• Assign tasks to team members\n`;
        message += `• Monitor team progress\n\n`;
        message += `🌐 Access your dashboard to manage tasks`;
      }
      
      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🌐 Open Dashboard', url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/dashboard` }
          ]]
        }
      });
      return;
    }

    if (allTasks.length === 0) {
      await ctx.reply('📝 No tasks assigned to you at the moment.');
      return;
    }

    let message = `📋 *Your Tasks*\n\n`;
    
    // Show incomplete tasks first
    if (incompleteTasks.length > 0) {
      message += `⏳ *Pending Tasks (${incompleteTasks.length}):*\n\n`;
      
      const inlineKeyboard = [];
      
      incompleteTasks.forEach((task, index) => {
        const priority = task.priority === 'HIGH' ? '🔴' : task.priority === 'MEDIUM' ? '🟡' : '🟢';
        
        message += `⏳ *Task ${index + 1}:* ${task.title}\n`;
        message += `${priority} Priority: ${task.priority}\n`;
        message += `📖 ${task.description}\n`;
        message += `🎯 Quest: ${task.quest?.title || 'No quest'}\n`;
        if (task.dueDate) {
          message += `📅 Due: ${new Date(task.dueDate).toLocaleDateString()}\n`;
        }
        message += `\n`;

        // Add completion button
        inlineKeyboard.push([{
          text: `✅ Complete Task ${index + 1}`,
          callback_data: `complete_${task._id}`
        }]);
      });
      
      message += '\n💡 Type "task X done" to complete task number X\n\n';
      
      // Show completed tasks summary
      if (completedTasks.length > 0) {
        message += `✅ *Completed Tasks:* ${completedTasks.length}\n`;
        message += `📊 *Progress:* ${Math.round((completedTasks.length / allTasks.length) * 100)}% complete\n\n`;
      }

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });
    } else {
      // All tasks are completed
      message += `🎉 *All Tasks Completed!*\n\n`;
      message += `✅ You have completed all ${completedTasks.length} task(s)!\n`;
      message += `📊 Progress: 100% complete\n\n`;
      message += `Great work! 🎊`;

      await ctx.reply(message, { 
        parse_mode: 'Markdown'
      });
    }

  } catch (error) {
    console.error('Error in tasks command:', error);
    await ctx.reply('❌ Sorry, there was an error fetching your tasks. Please try again later.');
  }
}