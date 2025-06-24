import express from 'express';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import mongoose from 'mongoose';

dotenv.config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/taskquest");
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}
const app = express();
app.set('view engine', 'ejs');
app.set('views', './views');

// Serve static files from dist
app.use(express.static('dist'));


const firebaseConfig = {
    apiKey: "AIzaSyCmS_rBZ9PWYlp_OCH-eUqboeYAIq_YsN0",
    authDomain: "oauth-practise-d450b.firebaseapp.com",
    projectId: "oauth-practise-d450b",
    storageBucket: "oauth-practise-d450b.firebasestorage.app",
    messagingSenderId: "337604840275",
    appId: "1:337604840275:web:0dbde6ee75e4b27d66afa6"
};

const firebaseApp = initializeApp(firebaseConfig);


const port = process.env.PORT || 3000;

//routes- later will refactor to seperate files
app.get('/', (req, res) => {
  res.render('index');
});
app.get('/otp', (req, res) => {
  res.render('otp');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  connectDB();
});