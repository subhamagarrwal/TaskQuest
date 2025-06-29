import { authenticateUser, updateTaskStatus, getTasksByUserId } from '../../services/taskService.js';
import User from '../../models/User.js';
import Task from '../../models/Task.js';

// Store user states for multi-step interactions
const userStates = new Map();

const messageHandler = async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const userState = userStates.get(userId);

  try {
    // Handle quest code input
    if (userState && userState.waitingFor === 'quest_code') {
      await handleQuestCodeInput(ctx, text);
      userStates.delete(userId);
      return;
    }

    // Handle other text inputs or provide general help
    if (!text.startsWith('/')) {
      // Check if it's a task completion command like "task 1 done"
      const taskCompletionMatch = text.toLowerCase().match(/^task\s+(\d+)\s+done$/);
      
      if (taskCompletionMatch) {
        await handleTaskCompletion(ctx, parseInt(taskCompletionMatch[1]));
        return;
      }
      
      // Generic help message for unrecognized text
      await ctx.reply(
        '🤖 I understand you sent a message, but I\'m not sure what you want me to do.\n\n' +
        'Use /help to see available commands, or use the buttons in my messages to interact with me.\n\n' +
        '💡 You can also type "task X done" to complete task number X (e.g., "task 1 done")'
      );
    }
  } catch (error) {
    console.error('Error in message handler:', error);
    await ctx.reply('❌ An error occurred. Please try again later.');
  }
};

// Handle quest code authentication
async function handleQuestCodeInput(ctx, questCode) {
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name;

  try {
    // Validate quest code format (you can customize this)
    if (!questCode || questCode.length < 6) {
      await ctx.reply('❌ Invalid quest code format. Please enter a valid quest code.');
      return;
    }

    // Attempt to authenticate user with the quest code
    const authResult = await authenticateUser(userId, username, questCode);
    
    if (authResult.success) {
      await ctx.reply(
        `✅ *Authentication Successful!*\n\n` +
        `Welcome to the quest: *${authResult.questName}*\n\n` +
        `You can now:\n` +
        `📋 Use /tasks to view your assignments\n` +
        `🔄 Use /update to update task status\n` +
        `ℹ️ Use /info to get detailed information`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        `❌ *Authentication Failed*\n\n` +
        `The quest code "${questCode}" is not valid or has expired.\n\n` +
        `Please check with your quest administrator for the correct code.\n\n` +
        `Use /auth to try again.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('Error authenticating user:', error);
    await ctx.reply('❌ An error occurred during authentication. Please try again later.');
  }
}

// Handle task completion via text command
async function handleTaskCompletion(ctx, taskNumber) {
  const telegramUserId = ctx.from.id;
  
  try {
    // Check if user is authenticated
    const user = await User.findOne({ telegramId: telegramUserId.toString() });
    
    if (!user || !user.telegramLinked) {
      await ctx.reply(
        '🔐 **Authentication Required**\n\n' +
        'You need to authenticate with a quest code first.\n\n' +
        'Use: `/auth <quest-code>`\n\n' +
        'Get your quest code from your admin.',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Get user's tasks
    const tasks = await Task.find({ assignedTo: user._id })
      .populate('quest', 'title')
      .sort({ createdAt: -1 });
    
    if (!tasks || tasks.length === 0) {
      await ctx.reply('📝 You have no tasks assigned to you at the moment.');
      return;
    }
    
    // Check if task number is valid
    const taskIndex = taskNumber - 1;
    if (taskIndex < 0 || taskIndex >= tasks.length) {
      await ctx.reply(
        `❌ Invalid task number!\n\n` +
        `You have ${tasks.length} task(s). Use a number between 1 and ${tasks.length}.\n\n` +
        `Use /tasks to see your available tasks.`
      );
      return;
    }
    
    const task = tasks[taskIndex];
    
    // Check if task is already completed
    if (task.status === 'completed') {
      await ctx.reply(
        `✅ **Task Already Completed**\n\n` +
        `Task ${taskNumber}: "${task.title}" is already marked as completed!`
      );
      return;
    }
    
    // Update task status to completed
    const updatedTask = await updateTaskStatus(user._id, task._id, 'completed');
    
    if (updatedTask) {
      await ctx.reply(
        `🎉 **Task Completed Successfully!**\n\n` +
        `✅ Task ${taskNumber}: "${task.title}"\n\n` +
        `Status changed from "${task.status}" to "completed"\n\n` +
        `Great work! Use /tasks to see your remaining tasks.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply('❌ Failed to update task. Please try again later.');
    }
    
  } catch (error) {
    console.error('Error handling task completion:', error);
    await ctx.reply('❌ An error occurred while updating the task. Please try again later.');
  }
}

// Set user state for waiting for quest code
export function setUserWaitingForQuestCode(userId) {
  userStates.set(userId, { waitingFor: 'quest_code' });
}

export default messageHandler;