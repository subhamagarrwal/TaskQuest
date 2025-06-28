import { sendMessage } from './telegramService.js';
import Task from '../models/Task.js';

export const notifyTaskUpdate = async (userId, taskId, updateDetails) => {
  try {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const message = `Task Update:\n\nTitle: ${task.title}\nStatus: ${task.status}\nDetails: ${updateDetails}`;
    await sendMessage(userId, message);
  } catch (error) {
    console.error('Error sending task update notification:', error);
  }
};

export const notifyNewTask = async (userId, task) => {
  try {
    const message = `New Task Assigned:\n\nTitle: ${task.title}\nDescription: ${task.description}`;
    await sendMessage(userId, message);
  } catch (error) {
    console.error('Error sending new task notification:', error);
  }
};