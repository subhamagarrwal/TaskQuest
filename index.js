import express from 'express';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import codesRoutes from './routes/codes.js';
import { requireAuth, requireAuthSSR, requireAuthFlexible } from './utils/jwt.js';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import flash from 'connect-flash';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import typeDefs from './src/schema/schema.js';
import resolvers from './src/resolvers/resolver.js';
import { verifyJwt } from './utils/jwt.js';
import BotCommand from './src/models/BotCommand.js';

// Load environment variables from .env file
dotenv.config();

console.log('🔍 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('MONGO_URI prefix:', process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 20) + '...' : 'undefined');

// MongoDB connection function
async function connectDB() {
  try {
    await mongoose.connect( process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10, // Maintain up to 10 socket connections
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1); // Exit if can't connect to database
  }
}

// Initialize Express application
const app = express();
const httpServer = http.createServer(app);

// GraphQL context function for authentication
const getGraphQLContext = async ({ req }) => {
  let user = null;
  
  // Try to get user from JWT token - check multiple sources
  const authHeader = req.headers.authorization?.replace('Bearer ', '');
  const httpOnlyToken = req.cookies?.token;
  const clientToken = req.cookies?.clientToken;
  
  const token = authHeader || clientToken || httpOnlyToken;
  
  if (token) {
    try {
      user = verifyJwt(token);
    } catch (error) {
      console.log('❌ GraphQL Context - Invalid token:', error.message);
    }
  }
  
  return { user, req };
};

// Main server startup function
async function startServer() {
  // MongoDB connection
  await connectDB();
  
  // Ensure connection is ready before proceeding
  console.log('🔗 Verifying MongoDB connection...');
  await mongoose.connection.db.admin().ping();
  console.log('✅ MongoDB connection verified');
  
  // Small delay to ensure everything is ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Initialize Telegram bot
  try {
    const { startTelegramBot } = await import('./src/bot/index.js');
    startTelegramBot();
  } catch (error) {
    console.error('❌ Failed to start Telegram bot:', error);
  }
  
  // Create Apollo Server
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  // Start Apollo Server
  await apolloServer.start();
  
  // Configure EJS as template engine
  app.set('view engine', 'ejs');
  app.set('views', './views');

  // Middleware setup for static files, parsing, and session management
  app.use(express.static('dist')); // Serve built assets
  app.use(express.static('public')); // Serve public assets
  app.use(cors()); // Enable CORS for API requests
  app.use(express.json()); // Parse JSON request bodies
  app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
  app.use(cookieParser()); // Parse cookies from requests

  // Session middleware for flash messages and user state
  // Generate a unique server instance ID to invalidate old sessions on restart
  const serverInstanceId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  // Create session store with error handling
  let sessionStore;
  try {
    sessionStore = MongoStore.create({
      client: mongoose.connection.getClient(),
      dbName: 'taskquest',
      collectionName: 'sessions',
      ttl: 24 * 60 * 60 // 1 day in seconds
    });
    console.log('✅ Session store created successfully');
  } catch (error) {
    console.error('❌ Error creating session store:', error);
    console.log('ℹ️ Using memory store as fallback');
    sessionStore = undefined; // Use default memory store
  }
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'taskquest_secret',
    resave: false,
    saveUninitialized: true, // Changed to true to ensure session exists
    store: sessionStore,
    cookie: { 
      maxAge: 1000 * 60 * 60 * 24, // 1 day session
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === 'production' // Use secure cookies in production
    },
    name: 'taskquest.sid' // Custom session name
  }));

  // Middleware to ensure session exists and handle server instance changes
  app.use((req, res, next) => {
    // Ensure session exists before proceeding
    if (!req.session) {
      console.error('❌ Session not available, regenerating...');
      return req.session.regenerate((err) => {
        if (err) {
          console.error('Failed to regenerate session:', err);
          return next(err);
        }
        req.session.serverInstanceId = serverInstanceId;
        next();
      });
    }
    
    // Check if this is a session from a previous server instance
    if (req.session.serverInstanceId && req.session.serverInstanceId !== serverInstanceId) {
      console.log('🔄 Destroying session from previous server instance');
      return req.session.destroy((err) => {
        if (err) console.error('Error destroying old session:', err);
        // Clear cookies and redirect to home to get a fresh session
        res.clearCookie('taskquest.sid');
        res.clearCookie('token');
        return res.redirect('/');
      });
    } else {
      // Mark session with current server instance
      req.session.serverInstanceId = serverInstanceId;
      next();
    }
  });

  // Flash message middleware for user notifications
  app.use(flash());

  // Make flash messages available in all EJS templates with robust error handling
  app.use((req, res, next) => {
    try {
      // Ensure session and flash are available before calling
      if (req.session && typeof req.flash === 'function') {
        res.locals.success = req.flash('success') || [];
        res.locals.error = req.flash('error') || [];
        res.locals.info = req.flash('info') || [];
      } else {
        console.warn('⚠️ Session or flash not available, using defaults');
        res.locals.success = [];
        res.locals.error = [];
        res.locals.info = [];
      }
    } catch (error) {
      console.error('❌ Flash middleware error:', error);
      // Provide default empty arrays if flash fails
      res.locals.success = [];
      res.locals.error = [];
      res.locals.info = [];
    }
    next();
  });

  // Mount authentication routes
  app.use('/api/auth', authRoutes);
  
  // Mount codes routes
  app.use('/api/codes', codesRoutes);

  // Simple API endpoint to get quest members (like quests.ejs does)
  app.get('/api/quest/:questId/members', requireAuthFlexible, async (req, res) => {
    try {
      const { questId } = req.params;
      console.log('📊 Fetching quest members for questId:', questId);
      
      const Quest = (await import('./src/models/Quest.js')).default;
      const User = (await import('./src/models/User.js')).default;
      
      // Get quest with populated members
      const quest = await Quest.findById(questId).populate('members', '_id username email').lean();
      
      if (!quest) {
        return res.status(404).json({ error: 'Quest not found' });
      }
      
      // Check for duplicates in the raw database data
      const rawQuest = await Quest.findById(questId).lean();
      const originalMembersCount = rawQuest.members.length;
      const uniqueMemberIds = [...new Set(rawQuest.members.map(id => id.toString()))];
      
      // If we found duplicates, clean them up
      if (uniqueMemberIds.length !== originalMembersCount) {
        console.log(`🧹 Found ${originalMembersCount - uniqueMemberIds.length} duplicate members in quest, cleaning up...`);
        
        const mongoose = (await import('mongoose')).default;
        await Quest.findByIdAndUpdate(questId, {
          members: uniqueMemberIds.map(id => new mongoose.Types.ObjectId(id))
        });
        
        console.log(`✅ Cleaned up ${originalMembersCount - uniqueMemberIds.length} duplicate members`);
        
        // Re-fetch the quest with cleaned data
        const cleanedQuest = await Quest.findById(questId).populate('members', '_id username email').lean();
        quest.members = cleanedQuest.members;
      }
      
      // Also get all users in the system for comparison
      const allUsers = await User.find({}, '_id username email').lean();
      
      console.log('📊 Quest members after cleanup:', quest.members.length);
      console.log('📊 All users in system:', allUsers.length);
      
      console.log('✅ Final quest members:');
      quest.members.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.username} (${member.email}) - ID: ${member._id}`);
      });
      
      console.log('📊 All users for reference:');
      allUsers.forEach((user, index) => {
        const inQuest = quest.members.some(m => m._id.toString() === user._id.toString());
        console.log(`   ${index + 1}. ${user.username} (${user.email}) - ID: ${user._id} ${inQuest ? '✅ IN QUEST' : '❌ NOT IN QUEST'}`);
      });
      
      res.json({ 
        success: true, 
        members: quest.members,
        questTitle: quest.title,
        totalUsersInSystem: allUsers.length,
        questMembersCount: quest.members.length,
        duplicatesRemoved: originalMembersCount - quest.members.length
      });
      
    } catch (error) {
      console.error('❌ Error fetching quest members:', error);
      res.status(500).json({ error: 'Failed to fetch quest members' });
    }
  });

  // Temporary cleanup endpoint to remove duplicate members from quests
  app.post('/api/quest/:questId/cleanup-members', requireAuthFlexible, async (req, res) => {
    try {
      const { questId } = req.params;
      console.log('🧹 Cleaning up duplicate members for questId:', questId);
      
      const Quest = (await import('./src/models/Quest.js')).default;
      
      const quest = await Quest.findById(questId);
      
      if (!quest) {
        return res.status(404).json({ error: 'Quest not found' });
      }
      
      console.log('📊 Original members array length:', quest.members.length);
      console.log('📊 Original members:', quest.members);
      
      // Remove duplicates by converting ObjectIds to strings and using Set
      const uniqueMemberIds = [...new Set(quest.members.map(id => id.toString()))];
      const mongoose = (await import('mongoose')).default;
      quest.members = uniqueMemberIds.map(id => new mongoose.Types.ObjectId(id));
      
      console.log('✅ Cleaned members array length:', quest.members.length);
      console.log('✅ Cleaned members:', quest.members);
      
      await quest.save();
      
      res.json({ 
        success: true, 
        message: 'Duplicate members removed',
        originalCount: quest.members.length + (uniqueMemberIds.length - quest.members.length),
        cleanedCount: quest.members.length,
        removedDuplicates: (quest.members.length + (uniqueMemberIds.length - quest.members.length)) - quest.members.length
      });
      
    } catch (error) {
      console.error('❌ Error cleaning up quest members:', error);
      res.status(500).json({ error: 'Failed to cleanup quest members' });
    }
  });

  // Mount GraphQL endpoint
  app.use('/graphql', cors(), express.json(), expressMiddleware(apolloServer, {
    context: getGraphQLContext
  }));

  // Health check endpoint for monitoring and keeping Render warm
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
      serverInstanceId: serverInstanceId,
      graphql: '/graphql endpoint available'
    });
  });

  // Comprehensive health check that tests database connectivity
  app.get('/api/health/detailed', async (req, res) => {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      serverInstanceId: serverInstanceId,
      checks: {
        database: 'unknown',
        memory: 'ok',
        uptime: 'ok'
      }
    };

    try {
      // Test database connection
      await mongoose.connection.db.admin().ping();
      healthCheck.checks.database = 'connected';
    } catch (error) {
      healthCheck.checks.database = 'disconnected';
      healthCheck.status = 'ERROR';
      console.error('Database health check failed:', error);
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    healthCheck.checks.memory = memUsedMB > 500 ? 'high' : 'ok';
    healthCheck.memory = {
      used: `${memUsedMB}MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    };

    // Check uptime
    const uptimeHours = process.uptime() / 3600;
    healthCheck.checks.uptime = uptimeHours > 24 ? 'long' : 'ok';

    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  });

  // Simple ping endpoint for external monitoring services
  app.get('/ping', (req, res) => {
    res.status(200).send('pong');
  });

  // Warmup endpoint that can be called to prevent cold starts
  app.get('/warmup', (req, res) => {
    console.log('🔥 Warmup request received at', new Date().toISOString());
    res.json({ 
      status: 'warm',
      timestamp: new Date().toISOString(),
      message: 'Server is warm and ready'
    });
  });

  // Bot Command Management API endpoints
  app.get('/api/bot-commands', requireAuthFlexible, async (req, res) => {
    try {
      const commands = await BotCommand.find({}).sort({ category: 1, command: 1 });
      res.json(commands);
    } catch (error) {
      console.error('Error fetching bot commands:', error);
      res.status(500).json({ error: 'Failed to fetch bot commands' });
    }
  });

  app.put('/api/bot-commands/:id', requireAuthFlexible, async (req, res) => {
    try {
      const { id } = req.params;
      const { description, responseMessage, isActive } = req.body;
      
      const updatedCommand = await BotCommand.findByIdAndUpdate(
        id,
        { description, responseMessage, isActive },
        { new: true, runValidators: true }
      );

      if (!updatedCommand) {
        return res.status(404).json({ error: 'Bot command not found' });
      }

      res.json(updatedCommand);
    } catch (error) {
      console.error('Error updating bot command:', error);
      res.status(500).json({ error: 'Failed to update bot command' });
    }
  });

  app.post('/api/bot-commands/bulk-update', requireAuthFlexible, async (req, res) => {
    try {
      const { commands } = req.body;
      
      if (!Array.isArray(commands)) {
        return res.status(400).json({ error: 'Commands must be an array' });
      }

      const updatePromises = commands.map(cmd => 
        BotCommand.findOneAndUpdate(
          { command: cmd.command },
          { 
            description: cmd.description,
            responseMessage: cmd.responseMessage,
            isActive: cmd.isActive !== undefined ? cmd.isActive : true
          },
          { new: true, runValidators: true }
        )
      );

      const updatedCommands = await Promise.all(updatePromises);
      res.json(updatedCommands);
    } catch (error) {
      console.error('Error bulk updating bot commands:', error);
      res.status(500).json({ error: 'Failed to update bot commands' });
    }
  });

  // Firebase configuration for client-side authentication
  const firebaseConfig = {
      apiKey: "AIzaSyCmS_rBZ9PWYlp_OCH-eUqboeYAIq_YsN0",
      authDomain: "oauth-practise-d450b.firebaseapp.com",
      projectId: "oauth-practise-d450b",
      storageBucket: "oauth-practise-d450b.firebasestorage.app",
      messagingSenderId: "337604840275",
      appId: "1:337604840275:web:0dbde6ee75e4b27d66afa6"
  };

  // Initialize Firebase app
  const firebaseApp = initializeApp(firebaseConfig);

  // Server port configuration
  const port = process.env.PORT || 4000;

  // Homepage route - Clear any existing auth state and show landing page
  app.get('/', (req, res) => {
    res.clearCookie('token'); // Clear authentication cookie
    res.clearCookie('taskquest.sid'); // Clear custom session cookie
    if (req.session) {
      // Destroy any existing session
      req.session.destroy((err) => {
        if (err) {
          console.log('Session destroy error:', err);
        }
        // Always render the homepage, even if session destroy fails
        res.render('index', { title: 'TaskQuest' });
      });
    } else {
      res.render('index', { title: 'TaskQuest' });
    }
  });

  // Dashboard route - Main application dashboard with real data from MongoDB
  app.get('/dashboard', requireAuthSSR, async (req, res) => {
    try {
      // Import models dynamically to avoid circular dependency issues
      const User = (await import('./src/models/User.js')).default;
      const Quest = (await import('./src/models/Quest.js')).default;
      const mongoose = (await import('mongoose')).default;
      
      // Find the authenticated user by their JWT userId
      let user = await User.findById(req.user.userId || req.user._id).lean();
      if (!user) {
        req.flash('error', 'User not found. Please log in again.');
        return res.redirect('/logout');
      }
      
      // Check if there are any quests in the system
      const allQuests = await Quest.find({}).lean();
      console.log(`📊 Total quests in system: ${allQuests.length}`);
      
      // Fetch quests assigned to this user ONLY - no auto-linking
      let quests = [];
      if (user.questsIn && user.questsIn.length > 0) {
        quests = await Quest.find({ _id: { $in: user.questsIn } })
          .populate('creator', 'username email role')
          .populate('members', 'username email role createdAt')
          .lean();
      }
      
      console.log('🚫 REMOVED AUTO-LINKING: Users are now only associated with quests they are explicitly added to');
      console.log('📊 User quest membership:', {
        userId: user._id,
        username: user.username,
        questsInArray: user.questsIn || [],
        actualQuestsFound: quests.length,
        totalQuestsInSystem: allQuests.length
      });
      
      // Debug: Log quests data
      console.log('📊 Dashboard Debug Info:');
      console.log('👤 User:', user.username);
      console.log('🔢 User questsIn array:', user.questsIn);
      console.log('🎯 Fetched quests:', quests.length, 'quests found');
      if (quests.length > 0) {
        console.log('📝 Quest details:', quests.map(q => ({ title: q.title, progress: q.progress, completed: q.completed })));
      }
      
      // Check if user has no quests - if so, show create quest modal on dashboard
      // Allow skipping the modal with ?skipModal=true query parameter for testing
      const skipModal = req.query.skipModal === 'true';
      
      // Show create quest prompt if user has no quests assigned to them
      const showCreateQuestPrompt = !skipModal && quests.length === 0;
      
      // Fetch tasks related to the user
      const Task = (await import('./src/models/Task.js')).default;
      let tasks = [];
      try {
        if (user.role === 'ADMIN') {
          // Admins can see all tasks in the system for assignment purposes
          tasks = await Task.find({})
            .populate('assignedTo', 'username email')
            .populate('quest', 'title description')
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 })
            .lean();
          console.log('📋 Admin: Fetched all tasks:', tasks.length, 'tasks found');
        } else {
          // Regular users only see tasks assigned to them
          const userId = user._id;
          tasks = await Task.find({ assignedTo: userId })
            .populate('quest', 'title description')
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 })
            .lean();
          console.log('📋 User: Fetched assigned tasks:', tasks.length, 'tasks found');
        }
      } catch (taskError) {
        console.warn('⚠️ Error fetching tasks:', taskError.message);
        // Continue with empty tasks array
      }
      
      // Fetch all users for team member management
      let allUsers = [];
      try {
        console.log('🔍 USER FILTERING DEBUG - Start');
        console.log('🔍 Current user ID:', user._id);
        console.log('🔍 Current user role:', user.role);
        console.log('🔍 Current user questsIn:', user.questsIn);
        
        if (user.role === 'ADMIN') {
          console.log('🔍 ADMIN PATH: Fetching users from current admin\'s quests only');
          
          // Get quests where current admin is the creator or member
          const adminQuests = await Quest.find({
            $or: [
              { creator: user._id },
              { members: user._id }
            ]
          }).select('_id title members').lean();
          
          console.log('🔍 Admin\'s quests:', adminQuests.map(q => ({ id: q._id, title: q.title, memberCount: q.members.length })));
          
          if (adminQuests.length > 0) {
            // Get all unique member IDs from admin's quests
            const memberIds = new Set();
            adminQuests.forEach(quest => {
              quest.members.forEach(memberId => {
                memberIds.add(memberId.toString());
              });
            });
            
            console.log('🔍 Unique member IDs from admin\'s quests:', Array.from(memberIds));
            
            // Only show users who are members of admin's quests
            allUsers = await User.find({
              _id: { $in: Array.from(memberIds) }
            })
            .select('username email role questsIn createdAt phone')
            .populate('questsIn', 'title')
            .sort({ createdAt: -1 })
            .lean();
            
            console.log('� FINAL ADMIN USERS - Count:', allUsers.length);
            allUsers.forEach((u, index) => {
              console.log(`🔍   ${index + 1}. ${u.username} (${u.email}) - ID: ${u._id}`);
              console.log(`🔍      Quests: ${u.questsIn.map(q => q.title).join(', ')}`);
            });
          } else {
            console.log('🔍 Admin has no quests, showing empty list');
            allUsers = [];
          }
            
        } else {
          console.log('🔍 NON-ADMIN PATH: Regular user filtering');
          // Regular users can see users who share quests with them, plus themselves
          const userQuestIds = user.questsIn || [];
          console.log('🔍 User quest IDs:', userQuestIds);
          
          if (userQuestIds.length > 0) {
            // Find users who are part of the same quests as the current user
            allUsers = await User.find({
              $or: [
                { questsIn: { $in: userQuestIds } }, // Users who share quests
                { _id: user._id } // Always include current user
              ]
            })
            .select('username email role questsIn createdAt phone')
            .populate('questsIn', 'title')
            .sort({ createdAt: -1 })
            .lean();
            
            console.log('🔍 FINAL NON-ADMIN USERS - Count:', allUsers.length);
            allUsers.forEach((u, index) => {
              console.log(`🔍   ${index + 1}. ${u.username} (${u.email}) - ID: ${u._id}`);
              console.log(`🔍      Quests: ${u.questsIn.map(q => q.title).join(', ')}`);
            });
            
            console.log('👥 User: Fetched team members:', allUsers.length, 'users found');
          } else {
            console.log('👥 Current user has no quests, showing only themselves');
            // If user has no quests, only show themselves
            allUsers = [user];
          }
        }
        console.log('🔍 USER FILTERING DEBUG - End');
      } catch (userError) {
        console.warn('⚠️ Error fetching users:', userError.message);
        // Continue with empty users array
      }
      
      // Set welcome message only once per session with proper session checks
      if (req.session && typeof req.flash === 'function' && !req.session.welcomeShown) {
        try {
          req.flash('success', `Welcome back, ${user.username || 'User'}! 🚀`);
          req.session.welcomeShown = true;
        } catch (flashError) {
          console.warn('⚠️ Could not set welcome flash message:', flashError.message);
        }
      }
      
      // Render dashboard with real user data and quest creation prompt if needed
      // Process quests to include their specific members for proper quest isolation
      const questsWithMembers = quests.map(quest => {
        console.log('🔍 Processing quest for member isolation:', {
          questId: quest._id,
          questTitle: quest.title,
          membersCount: quest.members ? quest.members.length : 0,
          memberDetails: quest.members ? quest.members.map(m => ({ id: m._id, username: m.username })) : []
        });
        
        return {
          ...quest,
          questMembers: quest.members || [] // These are already populated from the query
        };
      });
      
      res.render('dashboard', {
        user,
        tasks,
        quests: questsWithMembers,
        allUsers, // Keep for backwards compatibility, but template should use quest.questMembers
        activeSection: req.query.section || null,
        showCreateQuestPrompt // This will trigger the modal popup if no quests exist
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
      try {
        req.flash('error', 'Failed to load dashboard.');
      } catch (flashError) {
        console.warn('⚠️ Could not set error flash message:', flashError.message);
      }
      res.redirect('/');
    }
  });

  // OTP route - Firebase phone authentication page
  app.get('/otp', (req, res) => {
    res.render('otp');
  });

  // Logout route - Clear session and cookies, redirect to home
  app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('clientToken');
    req.session.destroy(() => {
      res.redirect('/');
    });
  });

  // Start the HTTP server (not just Express app)
  httpServer.listen(port, () => {
    console.log('🚀 TaskQuest Server Started');
    console.log(`📍 Server running on http://localhost:${port}`);
    console.log(`🔧 GraphQL endpoint: http://localhost:${port}/graphql`);
    console.log(`🆔 Server Instance ID: ${serverInstanceId}`);
    console.log('🔓 All previous sessions have been invalidated');
    console.log('════════════════════════════════════════════════');
  });
}

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});