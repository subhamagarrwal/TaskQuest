// TaskQuest Application - Express.js server with MongoDB, Firebase Auth, and EJS templates
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

// Connect to MongoDB on startup
connectDB();

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
      quests = await Quest.find({ _id: { $in: user.questsIn } }).lean();
    }
    
    // Check if user has no quests - if so, show create quest modal on dashboard
    const showCreateQuestPrompt = !quests || quests.length === 0;
    
    // Fetch tasks related to the user (placeholder for now)
    let tasks = [];
    
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

// Create Quest route - POST endpoint to create a new quest and assign to user
app.post('/quests', requireAuthSSR, async (req, res) => {
  try {
    console.log('🎯 Creating quest for user:', req.user.userId);
    console.log('📝 Quest data:', req.body);
    
    // Import models
    const Quest = (await import('./src/models/Quest.js')).default;
    const User = (await import('./src/models/User.js')).default;
    
    const { title, description } = req.body;
    
    // Validate required fields
    if (!title || title.trim() === '') {
      console.log('❌ Quest title missing');
      return res.status(400).json({ error: 'Quest title is required' });
    }
    
    const userId = req.user.userId || req.user._id;
    console.log('👤 Using userId:', userId);
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create new quest in database
    const questData = {
      title: title.trim(),
      description: description?.trim() || '',
      progress: 0,
      completed: false,
      creator: userId,
      members: [userId] // Add creator as first member
    };
    
    console.log('💾 Creating quest with data:', questData);
    const quest = await Quest.create(questData);
    console.log('✅ Quest created:', quest._id);
    
    // Add quest to user's questsIn array
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { questsIn: quest._id } }, // $addToSet prevents duplicates
      { new: true }
    );
    console.log('👤 Updated user questsIn:', updatedUser.questsIn);
    
    // Set success flash message for next page load
    req.flash('success', `Quest "${title}" created successfully! 🎯`);
    
    // Return success response
    return res.status(201).json({ 
      success: true, 
      quest: {
        _id: quest._id,
        title: quest.title,
        description: quest.description,
        progress: quest.progress,
        completed: quest.completed
      },
      message: 'Quest created and assigned to user'
    });
    
  } catch (err) {
    console.error('❌ Error creating quest:', err);
    console.error('Stack trace:', err.stack);
    return res.status(500).json({ 
      error: 'Failed to create quest',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Logout route - Clear session and cookies, redirect to home
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Test route for flash messages (development only)
app.get('/test-flash', (req, res) => {
  req.flash('success', 'This is a success flash message! ✅');
  req.flash('error', 'This is an error flash message! ❌');
  req.flash('info', 'This is an info flash message! ℹ️');
  res.redirect('/');
});

// Test route for protected access (development only) - triggers auth flash message
app.get('/test-auth', requireAuthSSR, (req, res) => {
  res.send(`
    <h1>✅ Authentication Successful!</h1>
    <p>User: ${req.user.email}</p>
    <p>User ID: ${req.user.userId}</p>
    <a href="/dashboard">Go to Dashboard</a> | 
    <a href="/logout">Logout</a> | 
    <a href="/">Home</a>
  `);
});

// Test database connection route (development only) - verify MongoDB connectivity
app.get('/test-db', async (req, res) => {
  try {
    const User = (await import('./src/models/User.js')).default;
    const Quest = (await import('./src/models/Quest.js')).default;
    
    const userCount = await User.countDocuments();
    const questCount = await Quest.countDocuments();
    const users = await User.find({}).limit(5).select('username email phone firebaseUid questsIn');
    const quests = await Quest.find({}).limit(5).select('title description creator progress');
    
    res.json({
      success: true,
      userCount,
      questCount,
      recentUsers: users,
      recentQuests: quests,
      message: 'Database connection working!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Database connection failed!'
    });
  }
});

// Test quest creation route (development only)
app.get('/test-quest-creation', requireAuthSSR, async (req, res) => {
  try {
    const Quest = (await import('./src/models/Quest.js')).default;
    const User = (await import('./src/models/User.js')).default;
    
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.json({ error: 'User not found', userId });
    }
    
    // Try to create a test quest
    const testQuest = await Quest.create({
      title: 'Test Quest ' + Date.now(),
      description: 'This is a test quest',
      progress: 0,
      completed: false,
      creator: userId,
      members: [userId]
    });
    
    // Add to user's questsIn
    await User.findByIdAndUpdate(userId, { $addToSet: { questsIn: testQuest._id } });
    
    res.json({
      success: true,
      user: user.username,
      userId,
      testQuest,
      message: 'Test quest created successfully!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      message: 'Test quest creation failed!'
    });
  }
});

// Test route for checking current user data (development only) - verify user role
app.get('/test-user-role', requireAuthSSR, async (req, res) => {
  try {
    const User = (await import('./src/models/User.js')).default;
    const user = await User.findById(req.user.userId || req.user._id).lean();
    
    res.json({
      success: true,
      currentUser: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        questsIn: user.questsIn
      },
      jwtPayload: req.user,
      message: 'Current user data retrieved!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get user data!'
    });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('🔒 All existing sessions cleared on startup');
  connectDB();
});