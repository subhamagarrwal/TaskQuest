import { User } from '../../models/User.js';
import { verifyJwt } from '../../../utils/jwt.js';

export const authenticateUser = async (telegramId, token) => {
  try {
    const userData = verifyJwt(token);
    const user = await User.findOne({ telegramId });

    if (!user) {
      const newUser = new User({
        telegramId,
        username: userData.username,
        // Add other user fields as necessary
      });
      await newUser.save();
      return newUser;
    }

    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Authentication failed');
  }
};

export const getUserSession = async (telegramId) => {
  try {
    const user = await User.findOne({ telegramId });
    return user ? user : null;
  } catch (error) {
    console.error('Error fetching user session:', error);
    throw new Error('Could not retrieve user session');
  }
};