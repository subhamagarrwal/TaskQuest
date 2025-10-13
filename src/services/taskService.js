import Task from '../models/Task.js';
import User from '../models/User.js';
import Quest from '../models/Quest.js';

// Function to create a new task
export const createTask = async (taskData) => {
  try {
    const newTask = new Task(taskData);
    await newTask.save();
    return newTask;
  } catch (error) {
    throw new Error('Error creating task: ' + error.message);
  }
};

// Function to retrieve tasks for a specific user
export const getUserTasks = async (userId) => {
  try {
    const tasks = await Task.find({ assignedTo: userId }).populate('quest', 'title');
    return tasks;
  } catch (error) {
    throw new Error('Error retrieving tasks: ' + error.message);
  }
};

// Function to get tasks by user ID (alias for getUserTasks for consistency)
export const getTasksByUserId = async (userId) => {
  try {
    const tasks = await Task.find({ assignedTo: userId }).populate('quest', 'title');
    return tasks;
  } catch (error) {
    throw new Error('Error retrieving tasks: ' + error.message);
  }
};

// Function to update a task's status (updated version with user authorization)
export const updateTaskStatusOld = async (taskId, status) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(taskId, { status }, { new: true });
    return updatedTask;
  } catch (error) {
    throw new Error('Error updating task status: ' + error.message);
  }
};

// Function to delete a task
export const deleteTask = async (taskId) => {
  try {
    await Task.findByIdAndDelete(taskId);
    return { message: 'Task deleted successfully' };
  } catch (error) {
    throw new Error('Error deleting task: ' + error.message);
  }
};

// Function to get user role in a quest
export const getUserRole = async (userId) => {
  try {
    const user = await User.findOne({ telegramId: userId }).populate('quests');
    if (user && user.quests && user.quests.length > 0) {
      // Return the role from the first quest (assuming user is in one quest at a time)
      return user.role || 'Member';
    }
    return null;
  } catch (error) {
    throw new Error('Error retrieving user role: ' + error.message);
  }
};

// Function to remove user from quest
export const removeUserFromQuest = async (telegramId) => {
  try {
    // Find user by Telegram ID first to get their MongoDB ObjectId
    const user = await User.findOne({ telegramId: telegramId.toString() });
    
    if (!user) {
      return false;
    }
    
    // Get the user's quest(s) to update
    const questIds = user.questsIn || [];
    
    // Remove user from all tasks (using the MongoDB ObjectId)
    await Task.updateMany(
      { assignedTo: user._id },
      { $unset: { assignedTo: "" } }
    );
    
    // Remove user from quest members
    if (questIds.length > 0) {
      await Quest.updateMany(
        { _id: { $in: questIds } },
        { $pull: { members: user._id } }
      );
    }
    
    // Clear user's quest list
    user.questsIn = [];
    await user.save();
    
    return true;
  } catch (error) {
    throw new Error('Error removing user from quest: ' + error.message);
  }
};

// Updated updateTaskStatus to handle userId and taskId with web notification
export const updateTaskStatus = async (userId, taskId, status) => {
  try {
    console.log(`🔄 Updating task status: userId=${userId}, taskId=${taskId}, status=${status}`);
    
    // Verify user has permission to update this task
    const task = await Task.findOne({ 
      _id: taskId, 
      assignedTo: userId 
    });
    
    if (!task) {
      console.log(`❌ Task not found or user not authorized: taskId=${taskId}, userId=${userId}`);
      console.log(`📋 Available tasks for user:`, await Task.find({ assignedTo: userId }).select('_id title'));
      throw new Error('Task not found or user not authorized');
    }
    
    console.log(`✅ Task found: ${task.title}, current status: ${task.status}, completed: ${task.completed}`);
    
    // Update the task using .save() to trigger middleware
    task.status = status;
    const updatedTask = await task.save();
    
    console.log(`✅ Task updated successfully: ${updatedTask.title}, new status: ${updatedTask.status}, completed: ${updatedTask.completed}`);
    
    // Notify all connected web clients about the task update
    // This would typically use WebSockets or Server-Sent Events
    // For now, we'll add a simple notification service
    try {
      const { notifyWebDashboard } = await import('./notificationService.js');
      await notifyWebDashboard('task_updated', {
        taskId,
        userId,
        status,
        task: updatedTask
      });
    } catch (notificationError) {
      console.log('Web notification failed (non-critical):', notificationError.message);
    }
    
    return updatedTask;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw new Error('Error updating task status: ' + error.message);
  }
};

// Function to authenticate user with quest code
export const authenticateUser = async (telegramId, username, questCode) => {
  try {
    // Find quest by invite code
    const quest = await Quest.findOne({ inviteCode: questCode });
    
    if (!quest) {
      return { success: false, message: 'Invalid quest code' };
    }
    
    // Check if quest is active
    if (quest.status !== 'active') {
      return { success: false, message: 'Quest is not active' };
    }
    
    // Find or create user
    let user = await User.findOne({ telegramId });
    
    if (!user) {
      user = new User({
        telegramId,
        username,
        quests: [quest._id]
      });
    } else {
      // Add quest to user if not already added
      if (!user.quests.includes(quest._id)) {
        user.quests.push(quest._id);
      }
    }
    
    await user.save();
    
    return { 
      success: true, 
      questName: quest.title,
      user: user 
    };
    
  } catch (error) {
    console.error('Error authenticating user:', error);
    return { success: false, message: 'Authentication failed' };
  }
};