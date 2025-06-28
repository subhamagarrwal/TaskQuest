import { updateTaskStatus, getTasksByUserId } from '../../services/taskService.js';
import { Markup } from 'telegraf';

export default async function updateCommand(ctx) {
    const userId = ctx.from.id;

    try {
        // Get user's tasks
        const tasks = await getTasksByUserId(userId);
        
        if (!tasks || tasks.length === 0) {
            return ctx.reply('❌ You have no tasks to update.');
        }

        let updateMessage = `
📝 *Update Task Status*

Select a task to update:
`;

        // Create buttons for each task
        const taskButtons = tasks.map((task, index) => [
            Markup.button.callback(
                `${index + 1}. ${task.title} (${task.status})`, 
                `update_task_${task._id}`
            )
        ]);

        const keyboard = Markup.inlineKeyboard([
            ...taskButtons,
            [Markup.button.callback('↩️ Cancel', 'update_cancel')]
        ]);

        await ctx.reply(updateMessage, {
            parse_mode: 'Markdown',
            ...keyboard
        });

    } catch (error) {
        console.error('Error fetching tasks for update:', error);
        ctx.reply('❌ There was an error fetching your tasks. Please try again later.');
    }
};