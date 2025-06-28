import { Markup } from 'telegraf';
import { removeUserFromQuest } from '../../services/taskService.js';

export default async function leaveCommand(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    
    const confirmMessage = `
⚠️ *Leave Quest Confirmation*

${username}, are you sure you want to leave your current quest?

⚠️ *Warning:* This action will:
• Remove you from all assigned tasks
• Delete your progress
• Require re-authentication to rejoin

This action cannot be undone.
    `;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('❌ Yes, Leave Quest', 'leave_confirm')],
        [Markup.button.callback('↩️ Cancel', 'leave_cancel')]
    ]);
    
    await ctx.reply(confirmMessage, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}
