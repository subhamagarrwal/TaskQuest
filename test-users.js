import './firebase_admin.js';
import User from './src/models/User.js';

async function checkUsers() {
  try {
    console.log('Connected to database');
    const users = await User.find({});
    console.log('All users in database:');
    users.forEach(user => {
      console.log('User:', user.username, 'Role:', user.role, 'ID:', user._id);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkUsers();
