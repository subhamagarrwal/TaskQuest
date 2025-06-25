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
    // Try to find user by firebaseUid (if you store it)
    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      // Try to find by username or email
      let username = decoded.name || decoded.email || decoded.phone_number || ('user' + Date.now());
      let email = decoded.email || (decoded.phone_number ? decoded.phone_number + '@example.com' : 'user' + Date.now() + '@example.com');
      let phone = decoded.phone_number || '';
      user = await User.findOne({ $or: [ { username }, { email } ] });
      if (user) {
        // Update user with firebaseUid and any new info
        user.firebaseUid = decoded.uid;
        user.email = email; // update email if changed
        if (phone) user.phone = phone; // only update if phone is non-empty
        await user.save();
      } else {
        // Create new user
        let userData = {
          username,
          email,
          firebaseUid: decoded.uid
        };
        if (phone) userData.phone = phone; // only set if non-empty
        user = await User.create(userData);
      }
    }
    const jwtToken = signJwt({ userId: user._id, email: user.email });
    res.json({ token: jwtToken, user });
  } catch (err) {
    console.error('Firebase token verification error:', err);
    res.status(401).json({ error: 'Invalid Firebase token' });
  }
});

export default router;