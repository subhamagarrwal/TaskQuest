import { sendMessage } from './telegramService.js';
import Task from '../models/Task.js';

// Store for web dashboard notifications (in production, use Redis or database)
let webNotificationQueue = [];

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

// New function to notify web dashboard about task updates
export const notifyWebDashboard = async (eventType, data) => {
  try {
    const notification = {
      id: Date.now(),
      timestamp: new Date(),
      eventType,
      data
    };
    
    // Add to notification queue
    webNotificationQueue.push(notification);
    
    // Keep only last 100 notifications to prevent memory issues
    if (webNotificationQueue.length > 100) {
      webNotificationQueue = webNotificationQueue.slice(-100);
    }
    
    console.log(`📢 Web notification queued: ${eventType}`, data);
    
    // In production, you would emit this to WebSocket clients or use Server-Sent Events
    // For now, we'll just log it and store it for polling
    
  } catch (error) {
    console.error('Error notifying web dashboard:', error);
  }
};

// Function to get pending notifications for web dashboard
export const getWebNotifications = (lastCheckTime = null) => {
  if (!lastCheckTime) {
    return webNotificationQueue.slice(-10); // Return last 10 notifications
  }
  
  const checkTime = new Date(lastCheckTime);
  return webNotificationQueue.filter(notification => 
    notification.timestamp > checkTime
  );
};

// Function to clear old notifications
export const clearOldNotifications = () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  webNotificationQueue = webNotificationQueue.filter(notification => 
    notification.timestamp > oneHourAgo
  );
};