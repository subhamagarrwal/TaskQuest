import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import startCommand from './commands/start.js';
import tasksCommand from './commands/tasks.js';
import taskCommand from './commands/task.js';
import updateCommand from './commands/update.js';
import helpCommand from './commands/help.js';
import authCommand from './commands/auth.js';
import infoCommand from './commands/info.js';
import leaveCommand from './commands/leave.js';
import messageHandler from './handlers/messageHandler.js';
import callbackHandler from './handlers/callbackHandler.js';
import errorHandler from './handlers/errorHandler.js';

// Load environment variables from .env file
dotenv.config();

let bot = null;

// Function to start the Telegram bot
export function startTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN not found in environment variables');
    return null;
  }

  try {
    // Initialize the Telegram bot with the token from environment variables
    bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

    // Register commands with special start command handling
    bot.start(async (ctx) => {
      const startPayload = ctx.startPayload; // This gets the parameter after /start
      
      if (startPayload && startPayload.startsWith('auth_')) {
        // Extract quest code from the payload
        const questCode = startPayload.replace('auth_', '');
        
        // Automatically run auth command with the quest code
        ctx.message.text = `/auth ${questCode}`;
        await authCommand(ctx);
        return;
      }
      
      // Regular start command
      await startCommand(ctx);
    });
    
    bot.command('tasks', tasksCommand);
    bot.command('task', taskCommand);
    bot.command('update', updateCommand);
    bot.command('help', helpCommand);
    bot.command('auth', authCommand);
    bot.command('info', infoCommand);
    bot.command('leave', leaveCommand);

    // Register message and callback handlers
    bot.on('text', messageHandler);
    bot.on('callback_query', callbackHandler);

    // Error handling
    bot.catch(errorHandler);

    // Start the bot
    bot.launch().then(() => {
      console.log('🤖 Telegram bot is running and ready to receive messages!');
      console.log('🔗 Bot token: ' + process.env.TELEGRAM_BOT_TOKEN.substring(0, 20) + '...');
    }).catch(err => {
      console.error('❌ Failed to start the Telegram bot:', err);
    });

    return bot;
  } catch (error) {
    console.error('❌ Error initializing Telegram bot:', error);
    return null;
  }
}

// Function to get the bot instance
export function getBotInstance() {
  return bot;
}

// Function to stop the bot
export function stopTelegramBot() {
  if (bot) {
    bot.stop();
    console.log('🛑 Telegram bot stopped');
  }
}