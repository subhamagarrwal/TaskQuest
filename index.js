import express from 'express';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
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

app.get('/', (req, res) => {
  res.render('index', { title: 'TaskQuest' });
});

app.get('/dashboard', (req, res) => {
  // Get the section from query parameters
  const activeSection = req.query.section || null;
  
  // Sample data - replace with real database queries later
  const sampleUser = {
    username: 'John Doe',
    email: 'john@example.com',
    role: 'ADMIN'
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
  
  res.render('dashboard', { 
    user: sampleUser, 
    tasks: sampleTasks,
    quests: sampleQuests,
    activeSection: activeSection
  });
});

app.get('/otp', (req, res) => {
  res.render('otp');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  connectDB();
});