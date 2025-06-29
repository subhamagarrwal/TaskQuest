import { updateTaskStatus, getTasksByUserId, removeUserFromQuest } from '../../services/taskService.js';
import { Markup } from 'telegraf';
import { setUserWaitingForQuestCode } from './messageHandler.js';
import tasksCommand from '../commands/tasks.js';
import updateCommand from '../commands/update.js';
import authCommand from '../commands/auth.js';
import helpCommand from '../commands/help.js';
import infoCommand from '../commands/info.js';

const callbackHandler = async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const userId = ctx.from.id;

    try {
        // Handle different callback actions
        switch (true) {
            // Start command callbacks
            case callbackData === 'start_auth':
                await authCommand(ctx);
                break;
            case callbackData === 'start_tasks':
                await tasksCommand(ctx);
                break;
            case callbackData === 'start_help':
                await helpCommand(ctx);
                break;

            // Authentication callbacks
            case callbackData === 'auth_enter_code':
                setUserWaitingForQuestCode(userId);
                await ctx.editMessageText(
                    '🔑 *Enter Quest Code*\n\nPlease send your quest invite code in the next message.',
                    { parse_mode: 'Markdown' }
                );
                break;
            case callbackData === 'auth_help':
                await ctx.editMessageText(
                    '❓ *Authentication Help*\n\nYour quest administrator should have provided you with an invite code. If you don\'t have one, please contact them.\n\nUse /auth to try again.',
                    { parse_mode: 'Markdown' }
                );
                break;

            // Task callbacks
            case callbackData === 'show_update_tasks':
                await updateCommand(ctx);
                break;
            case callbackData === 'show_detailed_info':
                await infoCommand(ctx);
                break;
            case callbackData === 'refresh_tasks':
                await tasksCommand(ctx);
                break;
            case callbackData === 'task_help':
                await ctx.editMessageText(
                    '❓ *Task Help*\n\nIf you don\'t have any tasks assigned, contact your quest administrator. They need to assign you to tasks in the quest.',
                    { parse_mode: 'Markdown' }
                );
                break;

            // Update task callbacks
            case callbackData.startsWith('update_task_'):
                await handleTaskUpdate(ctx, callbackData);
                break;
            case callbackData === 'update_cancel':
                await ctx.editMessageText('❌ Task update cancelled.');
                break;

            // Leave quest callbacks
            case callbackData === 'leave_confirm':
                await handleLeaveQuest(ctx);
                break;
            case callbackData === 'leave_cancel':
                await ctx.editMessageText('↩️ Leave quest cancelled. You remain in your current quest.');
                break;

            // Task status update callbacks
            case callbackData.startsWith('status_'):
                await handleStatusUpdate(ctx, callbackData);
                break;

            // Direct task completion callbacks (from tasks command)
            case callbackData.startsWith('complete_'):
                await handleDirectTaskCompletion(ctx, callbackData);
                break;

            default:
                console.log(`Unknown callback action: ${callbackData}`);
                return;
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
    }
};

// Handle task update selection
async function handleTaskUpdate(ctx, callbackData) {
    const taskId = callbackData.split('_')[2];
    
    const statusKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Mark Complete', `status_${taskId}_completed`)],
        [Markup.button.callback('🔄 In Progress', `status_${taskId}_in_progress`)],
        [Markup.button.callback('⏳ Not Started', `status_${taskId}_not_started`)],
        [Markup.button.callback('↩️ Back', 'show_update_tasks')]
    ]);

    await ctx.editMessageText(
        '📝 *Update Task Status*\n\nSelect the new status for this task:',
        {
            parse_mode: 'Markdown',
            ...statusKeyboard
        }
    );
}

// Handle status update
async function handleStatusUpdate(ctx, callbackData) {
    const [, taskId, newStatus] = callbackData.split('_');
    const userId = ctx.from.id;

    try {
        const result = await updateTaskStatus(userId, taskId, newStatus);
        
        if (result) {
            await ctx.editMessageText(
                `✅ Task updated successfully!\n\nStatus changed to: *${newStatus.replace('_', ' ')}*`,
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.editMessageText('❌ Failed to update task. Please try again later.');
        }
    } catch (error) {
        console.error('Error updating task status:', error);
        await ctx.editMessageText('❌ An error occurred while updating the task.');
    }
}

// Handle leaving quest
async function handleLeaveQuest(ctx) {
    const userId = ctx.from.id;
    
    try {
        const result = await removeUserFromQuest(userId);
        
        if (result) {
            await ctx.editMessageText(
                '✅ *Successfully left quest*\n\nYou have been removed from your quest and all associated tasks.\n\nUse /auth to join a new quest.',
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.editMessageText('❌ Failed to leave quest. Please try again later.');
        }
    } catch (error) {
        console.error('Error leaving quest:', error);
        await ctx.editMessageText('❌ An error occurred while leaving the quest.');
    }
}

// Handle direct task completion from "Complete Task X" buttons
async function handleDirectTaskCompletion(ctx, callbackData) {
    const taskId = callbackData.split('_')[1];
    const userId = ctx.from.id;

    try {
        console.log(`🔄 Attempting to complete task ${taskId} for telegram user ${userId}`);
        
        // Find the user by telegram ID
        const User = (await import('../../models/User.js')).default;
        const user = await User.findOne({ telegramId: userId.toString() });
        
        if (!user) {
            console.log(`❌ User not found for telegram ID: ${userId}`);
            await ctx.editMessageText('❌ User not found. Please authenticate first with /auth <quest-code>');
            return;
        }

        console.log(`✅ Found user: ${user.username} (MongoDB ID: ${user._id})`);

        // Update task status to completed
        const result = await updateTaskStatus(user._id, taskId, 'completed');
        
        if (result) {
            console.log(`✅ Task completed successfully: ${result.title}`);
            await ctx.editMessageText(
                `🎉 **Task Completed Successfully!**\n\n` +
                `✅ Task: "${result.title}"\n\n` +
                `Status changed to: *completed*\n\n` +
                `Great work! Use /tasks to see your remaining tasks.`,
                { parse_mode: 'Markdown' }
            );
        } else {
            console.log(`❌ Failed to complete task ${taskId}`);
            await ctx.editMessageText('❌ Failed to complete task. Please try again later.');
        }
    } catch (error) {
        console.error('Error completing task directly:', error);
        await ctx.editMessageText('❌ An error occurred while completing the task.');
    }
}

export default callbackHandler;