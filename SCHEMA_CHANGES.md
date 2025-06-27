# TaskQuest Schema Changes Documentation

## Overview
This document details the changes made to the TaskQuest application schema to implement proper role management and task-quest relationships.

## Date: June 27, 2025

## Changes Implemented

### 1. User Role Management System

#### Problem
- All users logging in through Firebase authentication were automatically assigned ADMIN role
- Existing users could have their roles changed arbitrarily
- No protection against role escalation

#### Solution
**File Modified:** `src/models/User.js`

- **Changed default role** from 'ADMIN' to 'USER'
- **Added immutable role constraint** using Mongoose's `immutable` property
- **Implemented pre-save middleware** to enforce role assignment rules:
  - First user in the system automatically becomes ADMIN
  - All subsequent users are assigned USER role by default
  - Role changes are prevented after user creation
- **Added `isFirstUser` field** to track the initial admin user

#### Key Changes:
```javascript
// Before
role: {type: String, enum: ['ADMIN', 'USER'], default: 'ADMIN'}

// After
role: {type: String, enum: ['ADMIN', 'USER'], default: 'USER', immutable: function() {
    return this.isModified('role') && !this.isNew;
}},
isFirstUser: { type: Boolean, default: false }
```

### 2. Task-Quest Relationship Constraints

#### Problem
- Tasks had a unique constraint on quest field, meaning only one task per quest
- This contradicted the requirement for multiple tasks per quest

#### Solution
**File Modified:** `src/models/Task.js`

- **Removed unique constraint** from quest field to allow multiple tasks per quest
- **Added quest immutability** - tasks cannot be reassigned to different quests after creation
- **Added database indexes** for efficient querying
- **Implemented pre-save middleware** to prevent quest reassignment

#### Key Changes:
```javascript
// Before
quest: {type: Schema.Types.ObjectId, ref: 'Quest', required: true, unique: true}

// After
quest: {type: Schema.Types.ObjectId, ref: 'Quest', required: true}
// Added middleware to prevent quest changes after creation
```

### 3. Authentication Route Updates

#### Problem
- Authentication routes were forcing ADMIN role on all users
- Existing users were having their roles overwritten

#### Solution
**File Modified:** `routes/auth.js`

- **Removed forced role assignment** in Firebase authentication
- **Let User model handle role assignment** through its pre-save middleware
- **Preserved existing user roles** during login/updates
- **Only update user profile information**, not roles

#### Key Changes:
- Removed all `user.role = 'ADMIN'` assignments
- Added comments explaining role management is handled by User model
- Role field excluded from user updates

### 4. GraphQL Resolver Updates

#### Problem
- Resolvers allowed unrestricted role updates
- No task management mutations existed
- Quest reassignment was possible

#### Solution
**File Modified:** `src/resolvers/resolver.js`

- **Removed role parameter** from updateUser mutation
- **Added comprehensive task mutations**:
  - `createTask` - Creates task and links to quest
  - `updateTask` - Updates task but prevents quest reassignment
  - `deleteTask` - Deletes task and removes from quest
- **Enhanced error handling** and validation

#### Key Changes:
```javascript
// Before - allowed role changes
updateUser: async (_, { id, username, email, phone, role, firebaseUid }) => {
  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: { username, email, phone, role, firebaseUid } },
    { new: true }
  );
  return updatedUser;
}

// After - role changes prevented
updateUser: async (_, { id, username, email, phone, firebaseUid }) => {
  const updateFields = {};
  if (username !== undefined) updateFields.username = username;
  if (email !== undefined) updateFields.email = email;
  if (phone !== undefined) updateFields.phone = phone;
  if (firebaseUid !== undefined) updateFields.firebaseUid = firebaseUid;
  
  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );
  return updatedUser;
}
```

## System Behavior After Changes

### User Registration Flow
1. **First User**: Automatically becomes ADMIN with `isFirstUser: true`
2. **Subsequent Users**: Assigned USER role by default
3. **Role Changes**: Impossible after user creation (protected by validation)

### Task Management
1. **Task Creation**: Must specify a quest, cannot be changed later
2. **Multiple Tasks**: Each quest can have unlimited tasks
3. **Task Updates**: All fields except quest assignment can be modified
4. **Quest Deletion**: Automatically deletes all associated tasks

### Security Improvements
- **Role Escalation Prevention**: Users cannot promote themselves to admin
- **Data Integrity**: Task-quest relationships are immutable
- **Validation**: All changes go through proper Mongoose validation
- **Error Handling**: Clear error messages for constraint violations

## Database Migration Notes

### For Existing Data
If you have existing data, you may need to:

1. **Identify the first admin user**:
   ```javascript
   // Find the earliest created user and mark as first user
   const firstUser = await User.findOne().sort({ createdAt: 1 });
   if (firstUser) {
     firstUser.isFirstUser = true;
     firstUser.role = 'ADMIN';
     await firstUser.save({ validateBeforeSave: false });
   }
   ```

2. **Review existing tasks**:
   ```javascript
   // Check for any orphaned tasks or quest relationship issues
   const tasks = await Task.find().populate('quest');
   tasks.forEach(task => {
     if (!task.quest) {
       console.log('Orphaned task found:', task._id);
     }
   });
   ```

## Testing Recommendations

1. **Test user registration** with fresh database
2. **Verify role immutability** by attempting role changes
3. **Test task creation and quest assignment**
4. **Validate error handling** for constraint violations
5. **Check cascade deletions** work properly

## Files Modified

1. `src/models/User.js` - Role management and validation
2. `src/models/Task.js` - Quest relationship constraints
3. `routes/auth.js` - Authentication role handling
4. `src/resolvers/resolver.js` - GraphQL mutations and validation

## Future Considerations

- Consider adding role-based permissions for different operations
- Implement audit logging for role-related actions
- Add API endpoints for admin user management
- Consider soft deletion for tasks and quests
