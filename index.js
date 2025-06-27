// TaskQuest Application - Express.js server with MongoDB, Firebase Auth, GraphQL, and EJS templates
import express from 'express';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import { requireAuth, requireAuthSSR } from './utils/jwt.js';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import flash from 'connect-flash';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import typeDefs from './src/schema/schema.js';
import resolvers from './src/resolvers/resolver.js';
import { verifyJwt } from './utils/jwt.js';

// Load environment variables from .env file
dotenv.config();

// MongoDB connection function
async function connectDB() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/taskquest");
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

// Initialize Express application
const app = express();
const httpServer = http.createServer(app);

// GraphQL context function for authentication
const getGraphQLContext = async ({ req }) => {
  let user = null;
  
  // Try to get user from JWT token
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
  
  if (token) {
    try {
      user = verifyJwt(token);
    } catch (error) {
      console.log('Invalid token in GraphQL context:', error.message);
    }
  }
  
  return { user, req };
};

// Main server startup function
async function startServer() {
  // MongoDB connection
  await connectDB();
  
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
  app.use(session({
    secret: process.env.SESSION_SECRET || 'taskquest_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day session
  }));

  // Flash message middleware for user notifications
  app.use(flash());

  // Make flash messages available in all EJS templates
  app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.info = req.flash('info');
    next();
  });

  // Mount authentication routes
  app.use('/api/auth', authRoutes);

  // Mount GraphQL endpoint
  app.use('/graphql', cors(), express.json(), expressMiddleware(apolloServer, {
    context: getGraphQLContext,
  }));

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
      
      // Find the authenticated user by their JWT userId
      let user = await User.findById(req.user.userId || req.user._id).lean();
      if (!user) {
        req.flash('error', 'User not found. Please log in again.');
        return res.redirect('/logout');
      }
      
      // Fetch all quests assigned to this user
      let quests = [];
      if (user.questsIn && user.questsIn.length > 0) {
        quests = await Quest.find({ _id: { $in: user.questsIn } })
          .populate('creator', 'username email')
          .populate('members', 'username email')
          .lean();
      }
      
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
      const showCreateQuestPrompt = !skipModal && (!quests || quests.length === 0);
      
      // Fetch tasks related to the user
      const Task = (await import('./src/models/Task.js')).default;
      let tasks = [];
      try {
        const userId = user._id; // Fix variable reference
        tasks = await Task.find({ assignedTo: userId })
          .populate('quest', 'title description')
          .populate('createdBy', 'username email')
          .sort({ createdAt: -1 }) // Sort by newest first
          .lean();
        console.log('📋 Fetched tasks:', tasks.length, 'tasks found');
      } catch (taskError) {
        console.warn('⚠️ Error fetching tasks:', taskError.message);
        // Continue with empty tasks array
      }
      
      // Set welcome message only once per session
      if (!req.session.welcomeShown) {
        req.flash('success', `Welcome back, ${user.username || 'User'}! 🚀`);
        req.session.welcomeShown = true;
      }
      
      // Render dashboard with real user data and quest creation prompt if needed
      res.render('dashboard', {
        user,
        tasks,
        quests,
        activeSection: req.query.section || null,
        showCreateQuestPrompt // This will trigger the modal popup if no quests exist
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
      req.flash('error', 'Failed to load dashboard.');
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
    req.session.destroy(() => {
      res.redirect('/');
    });
  });

  // Test route for GraphQL (development only)
  app.get('/test-graphql', (req, res) => {
    res.send(`
      <h1>🚀 GraphQL Endpoint Active</h1>
      <p>GraphQL endpoint is available at: <strong>/graphql</strong></p>
      <p>You can test queries and mutations using GraphQL Playground or any GraphQL client.</p>
      <a href="/dashboard">Go to Dashboard</a> | 
      <a href="/logout">Logout</a> | 
      <a href="/">Home</a>
    `);
  });

  // Database migration route - Remove unique index on Task.quest field
  app.get('/migrate-task-index', async (req, res) => {
    try {
      console.log('🔧 Starting database migration: removing unique index on Task.quest');
      
      // Get the tasks collection
      const db = mongoose.connection.db;
      const tasksCollection = db.collection('tasks');

      // List current indexes
      const indexes = await tasksCollection.indexes();
      console.log('📋 Current indexes:', indexes.map(i => i.name));

      // Check if quest_1 unique index exists
      const questIndex = indexes.find(index => index.name === 'quest_1');
      
      if (questIndex) {
        console.log('🔍 Found unique index on quest field, removing...');
        
        // Drop the unique index
        await tasksCollection.dropIndex('quest_1');
        console.log('✅ Successfully dropped unique index on quest field');
        
        res.json({
          success: true,
          message: 'Successfully removed unique index on quest field',
          action: 'Dropped quest_1 index',
          note: 'You can now create multiple tasks per quest'
        });
      } else {
        console.log('ℹ️ No unique index found on quest field');
        
        res.json({
          success: true,
          message: 'No unique index found on quest field',
          action: 'No action needed',
          indexes: indexes.map(i => ({ name: i.name, key: i.key }))
        });
      }

    } catch (error) {
      console.error('❌ Migration failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to remove unique index'
      });
    }
  });

  // Start the HTTP server (not just Express app)
  httpServer.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
    console.log(`📊 GraphQL endpoint: http://localhost:${port}/graphql`);
    console.log('🔒 All existing sessions cleared on startup');
  });
}

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});