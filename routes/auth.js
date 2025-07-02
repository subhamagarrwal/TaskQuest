import express from 'express';
import admin from '../firebase_admin.js';
import User from '../src/models/User.js';
import { signJwt } from '../utils/jwt.js';
import { verifyJwt } from '../utils/jwt.js';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyJwt(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Example protected route
const router = express.Router();

router.get('/protected', requireAuth, (req, res) => {
  res.json({ message: 'You are authenticated!', user: req.user });
});

// POST /firebase: handle Firebase login from frontend
router.post('/firebase', async (req, res) => {
  const { idToken } = req.body;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    
    // Try to find user by firebaseUid first
    let user = await User.findOne({ firebaseUid: decoded.uid });
    
    if (!user) {
      // Try to find by email if provided
      if (decoded.email) {
        user = await User.findOne({ email: decoded.email });
        if (user) {
          // Update existing user with firebaseUid but don't change role
          user.firebaseUid = decoded.uid;
          await user.save();
        }
      }
      
      if (!user) {
        // Create new user - role will be determined by User model pre-save middleware
        const username = decoded.name || decoded.email?.split('@')[0] || 'user' + Date.now();
        const email = decoded.email || 'user' + Date.now() + '@example.com';
        
        const userData = {
          username,
          email,
          firebaseUid: decoded.uid
          // Role will be set automatically by the model (ADMIN for first user, USER for others)
        };
        
        // Only add phone if it exists and is not null/empty
        if (decoded.phone_number && decoded.phone_number.trim()) {
          userData.phone = decoded.phone_number;
        }
        
        try {
          user = await User.create(userData);
        } catch (createError) {
          // Handle duplicate key errors
          if (createError.code === 11000) {
            console.log('Duplicate key error, trying to find existing user:', createError.message);
            
            // Try to find by email or username
            user = await User.findOne({ 
              $or: [
                { email: userData.email },
                { username: userData.username },
                ...(userData.phone ? [{ phone: userData.phone }] : [])
              ]
            });
            
            if (!user) {
              // If still not found, create with modified username
              userData.username = userData.username + '_' + Date.now();
              user = await User.create(userData);
            } else {
              // Update existing user with Firebase UID but don't change role
              user.firebaseUid = decoded.uid;
              await user.save();
            }
          } else {
            throw createError; // Re-throw if it's not a duplicate key error
          }
        }
      }
    } else {
      // User exists, update any new info but don't change role
      if (decoded.email && decoded.email !== user.email) {
        user.email = decoded.email;
      }
      if (decoded.phone_number && decoded.phone_number.trim() && decoded.phone_number !== user.phone) {
        user.phone = decoded.phone_number;
      }
      // Don't modify role for existing users - role is immutable after creation
      await user.save();
    }
    
    const jwtToken = signJwt({ userId: user._id, email: user.email, role: user.role });
    
    // Set httpOnly cookie for SSR routes (secure server-side access)
    res.cookie('token', jwtToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Set a separate cookie for client-side GraphQL access (not httpOnly)
    res.cookie('clientToken', jwtToken, { 
      httpOnly: false, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict' // Prevent CSRF attacks
    });
    
    res.json({ token: jwtToken, user });
  } catch (err) {
    console.error('Firebase token verification error:', err);
    res.status(401).json({ error: 'Invalid Firebase token' });
  }
});

export default router;