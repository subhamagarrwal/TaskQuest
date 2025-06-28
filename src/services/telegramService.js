import axios from 'axios';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Function to send a message to a user
export const sendMessage = async (chatId, text) => {
  try {
    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

// Function to send a task update to a user
export const sendTaskUpdate = async (chatId, task) => {
  const message = `Task Update:\n\n<b>Title:</b> ${task.title}\n<b>Status:</b> ${task.status}\n<b>Due Date:</b> ${task.dueDate}`;
  await sendMessage(chatId, message);
};

// Function to handle incoming updates from Telegram
export const handleUpdate = async (update) => {
  const { message, callback_query } = update;

  if (message) {
    const chatId = message.chat.id;
    const text = message.text;

    // Handle commands or messages
    // Example: if text starts with /task, call task-related functions
  } else if (callback_query) {
    const chatId = callback_query.message.chat.id;
    const data = callback_query.data;

    // Handle callback queries
    // Example: if data is related to a task update, call update functions
  }
};