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
export const removeUserFromQuest = async (userId) => {
  try {
    // Remove user from all tasks
    await Task.updateMany(
      { assignedTo: userId },
      { $pull: { assignedTo: userId } }
    );
    
    // Remove user from quest
    const user = await User.findOne({ telegramId: userId });
    if (user) {
      user.quests = [];
      await user.save();
      return true;
    }
    return false;
  } catch (error) {
    throw new Error('Error removing user from quest: ' + error.message);
  }
};

// Updated updateTaskStatus to handle userId and taskId
export const updateTaskStatus = async (userId, taskId, status) => {
  try {
    // Verify user has permission to update this task
    const task = await Task.findOne({ 
      _id: taskId, 
      assignedTo: userId 
    });
    
    if (!task) {
      throw new Error('Task not found or user not authorized');
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      taskId, 
      { status }, 
      { new: true }
    );
    return updatedTask;
  } catch (error) {
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