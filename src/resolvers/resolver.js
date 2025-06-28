import User from '../models/User.js';
import Quest from '../models/Quest.js';
import Task from '../models/Task.js';

const resolvers = {
  Query: {
    // Fetch all users
    users: async () => {
      return await User.find();
    },
    // Fetch a single user by ID
    user: async (_, { id }) => {
      return await User.findById(id);
    },
    // Fetch all quests
    quests: async () => {
      return await Quest.find();
    },
    // Fetch a single quest by ID
    quest: async (_, { id }) => {
      return await Quest.findById(id);
    },
    // Fetch all tasks
    tasks: async () => {
      return await Task.find();
    },
    // Fetch a single task by ID
    task: async (_, { id }) => {
      return await Task.findById(id);
    },
  },
  Mutation: {
    // Create a new user
    createUser: async (_, { username, email, phone, role, firebaseUid }) => {
      console.log('👤 Creating user:', { username, email, phone, role, firebaseUid });
      
      try {
        // Check if this is the first user in the system
        const userCount = await User.countDocuments();
        
        // If this is the first user, make them an admin regardless of the role parameter
        let finalRole = role;
        let isFirstUser = false;
        if (userCount === 0) {
          finalRole = 'ADMIN';
          isFirstUser = true;
          console.log('🔑 First user in system - automatically assigning ADMIN role');
        }
        
        // Additional validation for admin role
        if (finalRole === 'ADMIN') {
          // Check if this user already exists and has quests
          const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
          });
          
          if (existingUser && existingUser.questsIn && existingUser.questsIn.length > 0) {
            throw new Error('Users who are assigned to quests cannot become admins. Please remove the user from all quests first.');
          }
        }
        
        const user = new User({ 
          username, 
          email, 
          phone, 
          role: finalRole, 
          firebaseUid 
        });
        
        await user.save();
        console.log('✅ User created successfully:', user._id, 'with role:', finalRole);
        
        // Serialize ObjectId to string for GraphQL
        const result = {
          ...user.toObject(),
          id: user._id.toString(),
          isFirstUser: isFirstUser // Add flag to indicate if this was the first user
        };
        
        return result;
      } catch (error) {
        console.error('❌ Error creating user:', error);
        throw new Error('Failed to create user: ' + error.message);
      }
    },
    // Update an existing user (prevent role changes)
    updateUser: async (_, { id, username, email, phone, firebaseUid }) => {
      // Explicitly exclude role from updates to prevent role changes
      const updateFields = {};
      if (username !== undefined) updateFields.username = username;
      if (email !== undefined) updateFields.email = email;
      if (phone !== undefined) updateFields.phone = phone;
      if (firebaseUid !== undefined) updateFields.firebaseUid = firebaseUid;
      
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );
      return updatedUser;
    },
    // Delete a user
    deleteUser: async (_, { id }) => {
      console.log('🗑️ Deleting user:', id);
      
      try {
        // Find the user first
        const user = await User.findById(id);
        if (!user) {
          throw new Error('User not found');
        }
        
        // Remove user from all quests they are members of
        await Quest.updateMany(
          { members: id },
          { $pull: { members: id } }
        );
        
        // Remove all tasks assigned to this user
        await Task.deleteMany({ assignedTo: id });
        
        // Finally, delete the user
        const deletedUser = await User.findByIdAndDelete(id);
        
        console.log('✅ User deleted successfully:', id);
        
        // Serialize ObjectId to string for GraphQL
        return {
          ...deletedUser.toObject(),
          id: deletedUser._id.toString()
        };
      } catch (error) {
        console.error('❌ Error deleting user:', error);
        throw new Error('Failed to delete user: ' + error.message);
      }
    },
    // Create a new quest
    createQuest: async (_, { title, description, completionDate, creatorId }) => {
      console.log('🎯 Creating quest with:', { title, description, completionDate, creatorId });
      
      try {
        // Check if a quest already exists in the system
        const existingQuestCount = await Quest.countDocuments();
        if (existingQuestCount > 0) {
          throw new Error('Only one quest is allowed in the system. Please edit the existing quest instead of creating a new one.');
        }
        
        const questData = {
          title,
          description,
          creator: creatorId,
          createdBy: creatorId,
          members: [creatorId],
          tasks: []
        };
        
        // Add completion date if provided
        if (completionDate) {
          questData.completionDate = new Date(completionDate);
        }
        
        const quest = new Quest(questData);
        
        await quest.save();
        console.log('✅ Quest saved:', quest._id);
        
        // Add the quest to the creator's questsIn array
        await User.findByIdAndUpdate(
          creatorId,
          { $addToSet: { questsIn: quest._id } },
          { new: true }
        );
        
        console.log('✅ User updated with new quest:', quest._id);
        
        // Serialize ObjectId to string for GraphQL
        return {
          ...quest.toObject(),
          id: quest._id.toString(),
          creator: quest.creator.toString(),
          members: quest.members.map(m => m.toString()),
          completionDate: quest.completionDate ? quest.completionDate.toISOString() : null
        };
      } catch (error) {
        console.error('❌ Error creating quest:', error);
        throw new Error('Failed to create quest: ' + error.message);
      }
    },
    // Update an existing quest
    updateQuest: async (_, { id, title, description, completionDate, members }) => {
      console.log('🎯 Updating quest:', { id, title, description, completionDate, members });
      
      try {
        const update = {};
        if (title !== undefined) update.title = title;
        if (description !== undefined) update.description = description;
        if (completionDate !== undefined) {
          update.completionDate = completionDate ? new Date(completionDate) : null;
        }
        if (members !== undefined) update.members = members;
        
        const updatedQuest = await Quest.findByIdAndUpdate(
          id,
          { $set: update },
          { new: true }
        );
        
        if (!updatedQuest) {
          throw new Error('Quest not found');
        }
        
        console.log('✅ Quest updated successfully:', updatedQuest._id);
        
        // Serialize ObjectId to string for GraphQL
        return {
          ...updatedQuest.toObject(),
          id: updatedQuest._id.toString(),
          creator: updatedQuest.creator.toString(),
          members: updatedQuest.members.map(m => m.toString()),
          completionDate: updatedQuest.completionDate ? updatedQuest.completionDate.toISOString() : null
        };
      } catch (error) {
        console.error('❌ Error updating quest:', error);
        throw new Error('Failed to update quest: ' + error.message);
      }
    },
    // Delete a quest and cascade delete associated tasks and user references
    deleteQuest: async (_, { id }) => {
      // Delete all tasks associated with this quest
      await Task.deleteMany({ quest: id });
      // Remove this quest from all users' questsIn arrays
      await User.updateMany(
        { questsIn: id },
        { $pull: { questsIn: id } }
      );
      // Finally, delete the quest itself
      return await Quest.findByIdAndDelete(id);
    },
    // Create a new task
    createTask: async (_, { title, description, assignedTo, questId, priority, createdBy }) => {
      console.log('📝 createTask resolver called with:', {
        title,
        description,
        assignedTo: typeof assignedTo + ' - ' + assignedTo,
        questId: typeof questId + ' - ' + questId,
        priority,
        createdBy: typeof createdBy + ' - ' + createdBy
      });
      
      try {
        const task = new Task({
          title,
          description,
          assignedTo,
          quest: questId, // Each task belongs to exactly one quest
          priority,
          createdBy
        });
        
        console.log('💾 About to save task:', task);
        await task.save();
        console.log('✅ Task saved successfully:', task._id);
        
        // Add task to the quest's tasks array
        await Quest.findByIdAndUpdate(
          questId,
          { $addToSet: { tasks: task._id } }
        );
        
        console.log('🎯 Task added to quest successfully');
        
        // Return the task with populated fields to match GraphQL schema expectations
        const populatedTask = await Task.findById(task._id)
          .populate('assignedTo', 'username email')
          .populate('quest', 'title description')
          .populate('createdBy', 'username email');
        
        // Convert to plain object and ensure all ObjectIds are strings
        const taskObj = populatedTask.toObject();
        
        // Convert all ObjectId fields to strings for GraphQL serialization
        const serializedTask = {
          ...taskObj,
          id: taskObj._id.toString(),
          assignedTo: {
            ...taskObj.assignedTo,
            id: taskObj.assignedTo._id.toString()
          },
          quest: {
            ...taskObj.quest,
            id: taskObj.quest._id.toString()
          },
          createdBy: {
            ...taskObj.createdBy,
            id: taskObj.createdBy._id.toString()
          }
        };
        
        console.log('📋 Returning serialized task:', JSON.stringify(serializedTask, null, 2));
        return serializedTask;
        
      } catch (error) {
        console.error('❌ Error in createTask resolver:', error);
        throw error;
      }
    },
    
    // Update an existing task (cannot change quest assignment)
    updateTask: async (_, { id, title, description, completed, priority, assignedTo }) => {
      // Explicitly exclude quest from updates to prevent quest reassignment
      const updateFields = {};
      if (title !== undefined) updateFields.title = title;
      if (description !== undefined) updateFields.description = description;
      if (completed !== undefined) updateFields.completed = completed;
      if (priority !== undefined) updateFields.priority = priority;
      if (assignedTo !== undefined) updateFields.assignedTo = assignedTo;
      
      const updatedTask = await Task.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).populate('assignedTo', 'username email')
       .populate('quest', 'title description')
       .populate('createdBy', 'username email');
      
      return updatedTask;
    },
    
    // Delete a task and remove it from the quest
    deleteTask: async (_, { id }) => {
      const task = await Task.findById(id);
      if (!task) throw new Error('Task not found');
      
      // Remove task from quest's tasks array
      await Quest.findByIdAndUpdate(
        task.quest,
        { $pull: { tasks: id } }
      );
      
      return await Task.findByIdAndDelete(id);
    },
  },
};

export default resolvers;
