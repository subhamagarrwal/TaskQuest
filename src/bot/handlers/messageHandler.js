import authCommand from '../commands/auth.js';

// Store user states for multi-step interactions
const userStates = new Map();

const messageHandler = async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const userState = userStates.get(userId);

  console.log('📨 Message handler called:', { 
    userId, 
    text, 
    hasUserState: !!userState,
    isCommand: text.startsWith('/') 
  });

  try {
    // Handle quest code input
    if (userState && userState.waitingFor === 'quest_code') {
      await handleQuestCodeInput(ctx, text);
      userStates.delete(userId);
      return;
    }

    // Handle other text inputs or provide general help
    if (!text.startsWith('/')) {
      // Check if this looks like an authentication code
      if (text && (text.startsWith('ADM') || text.startsWith('USR') || text.length >= 6)) {
        console.log(`🔑 Detected potential auth code: ${text}`);
        // Treat this as an auth command with the code
        const mockMessage = {
          text: `/auth ${text.trim()}`
        };
        
        const mockCtx = {
          ...ctx,
          message: mockMessage
        };
        
        console.log(`📤 Calling authCommand with code: ${text}`);
        await authCommand(mockCtx);
        return;
      }

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
  try {
    // Validate quest code format
    if (!questCode || questCode.length < 6) {
      await ctx.reply('❌ Invalid quest code format. Please enter a valid quest code.');
      return;
    }

    console.log(`🔐 Handling quest code input: ${questCode} from user ${ctx.from.id}`);

    // Create a mock context with the quest code as if it was sent via /auth command
    const mockMessage = {
      text: `/auth ${questCode.trim()}`
    };
    
    const mockCtx = {
      ...ctx,
      message: mockMessage,
      from: ctx.from, // Ensure from property is preserved
      // Ensure all ctx methods are available
      reply: ctx.reply.bind(ctx),
      editMessageText: ctx.editMessageText ? ctx.editMessageText.bind(ctx) : undefined
    };

    console.log(`📤 Calling authCommand with mock context`);
    // Use the authCommand function to handle authentication
    await authCommand(mockCtx);
    
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