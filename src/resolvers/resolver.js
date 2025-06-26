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
      const user = new User({ username, email, phone, role, firebaseUid });
      await user.save();
      return user;
    },
    // Update an existing user
    updateUser: async (_, { id, username, email, phone, role, firebaseUid }) => {
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: { username, email, phone, role, firebaseUid } },
        { new: true }
      );
      return updatedUser;
    },
    // Delete a user
    deleteUser: async (_, { id }) => {
      return await User.findByIdAndDelete(id);
    },
    // Create a new quest
    createQuest: async (_, { title, description, creatorId }) => {
      const quest = new Quest({
        title,
        description,
        creator: creatorId,
        createdBy: creatorId,
        members: [creatorId],
        tasks: []
      });
      await quest.save();
      return quest;
    },
    // Update an existing quest
    updateQuest: async (_, { id, title, description, members }) => {
      const update = {};
      if (title !== undefined) update.title = title;
      if (description !== undefined) update.description = description;
      if (members !== undefined) update.members = members;
      const updatedQuest = await Quest.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
      );
      return updatedQuest;
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
  },
};

export default resolvers;
