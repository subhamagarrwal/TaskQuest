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

            default:
                await ctx.answerCallbackQuery('Unknown action. Please try again.');
                return;
        }

        await ctx.answerCallbackQuery();
    } catch (error) {
        console.error('Error handling callback query:', error);
        await ctx.answerCallbackQuery('An error occurred. Please try again later.');
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

export default callbackHandler;