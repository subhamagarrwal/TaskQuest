import { authenticateUser } from '../../services/taskService.js';

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
      await ctx.reply(
        '🤖 I understand you sent a message, but I\'m not sure what you want me to do.\n\n' +
        'Use /help to see available commands, or use the buttons in my messages to interact with me.'
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

// Set user state for waiting for quest code
export function setUserWaitingForQuestCode(userId) {
  userStates.set(userId, { waitingFor: 'quest_code' });
}

export default messageHandler;