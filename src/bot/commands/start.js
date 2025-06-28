import { Markup } from 'telegraf';

export default async function startCommand(ctx) {
    const username = ctx.from.username || ctx.from.first_name;
    
    const welcomeMessage = `
🎉 *Welcome to TaskQuest Bot!*

Hello ${username}! TaskQuest helps you manage collaborative quests and tasks with your team.

🔐 *First Time?* You'll need to authenticate with a quest invite code.
📋 *Returning User?* Check your tasks and update your progress!

Quick Actions:
    `;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔐 Authenticate', 'start_auth')],
        [Markup.button.callback('📋 View Tasks', 'start_tasks')],
        [Markup.button.callback('❓ Get Help', 'start_help')]
    ]);
    
    await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}