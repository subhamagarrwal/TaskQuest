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
dotenv.config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/taskquest");
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}
const app = express();
app.set('view engine', 'ejs');
app.set('views', './views');

// Serve static files from dist
app.use(express.static('dist'));
app.use(express.static('public'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Add session and flash middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'taskquest_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));
app.use(flash());
// Make flash messages available in all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  next();
});
app.use('/api/auth', authRoutes);

const firebaseConfig = {
    apiKey: "AIzaSyCmS_rBZ9PWYlp_OCH-eUqboeYAIq_YsN0",
    authDomain: "oauth-practise-d450b.firebaseapp.com",
    projectId: "oauth-practise-d450b",
    storageBucket: "oauth-practise-d450b.firebasestorage.app",
    messagingSenderId: "337604840275",
    appId: "1:337604840275:web:0dbde6ee75e4b27d66afa6"
};

const firebaseApp = initializeApp(firebaseConfig);

connectDB();

const port = process.env.PORT || 3000;

// Clear any auth cookie on homepage load and ensure no session exists
app.get('/', (req, res) => {
  res.clearCookie('token');
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.log('Session destroy error:', err);
      }
      // Always render the page, even if there's an error destroying session
      res.render('index', { title: 'TaskQuest' });
    });
  } else {
    res.render('index', { title: 'TaskQuest' });
  }
});

app.get('/dashboard', requireAuthSSR, (req, res) => {
  // Get the section from query parameters
  const activeSection = req.query.section || null;
  
  // Sample data - replace with real database queries later
  const sampleUser = {
    username: 'John Doe',
    email: 'john@example.com',
    role: 'ADMIN',
    isNew: req.query.new === '1' // Simulate new user for demo
  };
  
  const sampleTasks = [
    {
      title: 'Setup Firebase Authentication',
      description: 'Configure phone and email authentication',
      completed: true,
      priority: 'HIGH'
    },
    {
      title: 'Create Dashboard UI',
      description: 'Design and implement the main dashboard',
      completed: false,
      priority: 'MEDIUM'
    },
    {
      title: 'Implement GraphQL API',
      description: 'Setup resolvers and mutations',
      completed: false,
      priority: 'HIGH'
    }
  ];

  const sampleQuests = [
    {
      title: 'Complete Project Setup',
      description: 'Initialize all required components',
      progress: 75,
      completed: false
    },
    {
      title: 'User Authentication Quest',
      description: 'Implement Firebase authentication',
      progress: 100,
      completed: true
    }
  ];
  
  // Set flash message only once per session
  if (!req.session.welcomeShown) {
    if (sampleUser.isNew) {
      req.flash('success', 'Welcome to TaskQuest! 🎯');
    } else {
      req.flash('success', `Welcome back, ${sampleUser.username ? sampleUser.username : 'User'}! 🚀`);
    }
    req.session.welcomeShown = true;
  }
  
  res.render('dashboard', { 
    user: sampleUser, 
    tasks: sampleTasks,
    quests: sampleQuests,
    activeSection: activeSection,
    isNewUser: sampleUser.isNew
  });
});

app.get('/otp', (req, res) => {
  res.render('otp');
});

// Logout route
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Test route for flash messages (for debugging)
app.get('/test-flash', (req, res) => {
  req.flash('success', 'This is a success flash message! ✅');
  req.flash('error', 'This is an error flash message! ❌');
  req.flash('info', 'This is an info flash message! ℹ️');
  res.redirect('/');
});

// Test route for protected access (triggers auth flash message)
app.get('/test-auth', requireAuthSSR, (req, res) => {
  res.send('You are authenticated!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('🔒 All existing sessions cleared on startup');
  connectDB();
});