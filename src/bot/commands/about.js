import User from '../../models/User.js';

const about = async (ctx) => {
  const chatId = ctx.chat.id;
  
  try {
    const aboutMessage = `ℹ️ *About TaskQuest*

TaskQuest is a collaborative task management platform that gamifies your workflow!

🎯 *Features:*
• Quest-based project organization
• Real-time task tracking  
• Team collaboration tools
• Telegram bot integration
• Progress analytics & insights

🤖 *Bot Commands:*
• /start - Get started with TaskQuest
• /auth - Join a quest with invite code
• /tasks - View your assigned tasks
• /update - Update task progress
• /help - Show all available commands

Created with ❤️ for productive teams.

Visit our dashboard for the full experience!`;

    await ctx.reply(aboutMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 Open Dashboard', url: 'https://taskquest.example.com/dashboard' },
            { text: '📚 Documentation', url: 'https://docs.taskquest.example.com' }
          ]
        ]
      }
    });

  } catch (error) {
    console.error('Error in about command:', error);
    await ctx.reply('❌ Sorry, there was an error retrieving the about information. Please try again later.');
  }
};

export default about;
