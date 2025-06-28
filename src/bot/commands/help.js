export default async function helpCommand(ctx) {
    const helpMessage = `
🤖 *TaskQuest Bot Help*

Here are the commands you can use:

🚀 */start* - Start interacting with the bot and receive a welcome message
🔐 */auth* - Authenticate yourself to join a quest
📋 */tasks* - View your current tasks and their statuses
� */task <number>* - Get detailed info about a specific task (e.g., /task 1)
�🔄 */update* - Update the status of your tasks (with buttons)
ℹ️ */info* - Get detailed information about your tasks and role
❌ */leave* - Remove yourself from the current quest
❓ */help* - Show this help message

💡 *How it works:*
1. Use /auth to authenticate with your quest invite code
2. Use /tasks to see your assigned tasks
3. Use /task <number> to get detailed info about a specific task
4. Use /update to mark tasks as complete or change their status
5. Use /info to get an overview of your role and all tasks
6. Use /leave if you want to exit the quest

*Example workflow:*
• /auth → Enter your quest code
• /tasks → See "1. Complete project setup"
• /task 1 → Get detailed info about task 1
• /update → Select task 1 → Mark as completed

If you have any questions, feel free to ask!
    `;
    
    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
}