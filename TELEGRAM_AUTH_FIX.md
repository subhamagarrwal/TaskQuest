# Fix for Telegram Authentication Duplicate Key Error

## Problem
When users tried to authenticate via Telegram using their code (`/auth USRO4IOTW`), they received an error:
```
E11000 duplicate key error collection: test.users index: telegramId_1 dup key: { telegramId: "845713188" }
```

This error occurred because:
1. A user with Telegram ID "845713188" was already in the database
2. When another user tried to authenticate with a code, the system attempted to link the same Telegram ID to a different user account
3. MongoDB's unique index on `telegramId` prevented the duplicate, causing the error

## Solution Implemented

### 1. Enhanced Authentication Functions
Updated three authentication functions in `src/bot/commands/auth.js`:

#### `authenticateUser()` - For user code authentication
- Added check to see if the Telegram ID is already linked to another user
- Added check to see if the user account is already linked to a different Telegram account
- Returns clear error messages when conflicts are detected

#### `authenticateAdmin()` - For admin code authentication
- Same duplicate checks as user authentication
- Prevents linking the same Telegram account to multiple admin accounts

#### `authenticateLegacyQuest()` - For legacy quest codes
- Added duplicate checks before updating existing user records
- Prevents overwriting existing Telegram links

### 2. Database Cleanup Script
Created `fix-duplicate-telegram.js` to:
- Find all users with duplicate Telegram IDs
- Display detailed information about conflicts
- Auto-fix by keeping the first user and unlinking others
- Show users with pending link codes

## How to Fix the Current Issue

### Step 1: Run the Database Cleanup Script
```cmd
node fix-duplicate-telegram.js
```

This will:
- Identify the duplicate Telegram ID (845713188)
- Keep it linked to the first user
- Unlink it from any other user accounts
- Show you which accounts were affected

### Step 2: Restart Your Application
After cleaning up the database, restart your Node.js application:
```cmd
# Stop the current process (Ctrl+C)
# Then restart
npm start
```

### Step 3: Test Authentication
1. The user who wants to authenticate should request a new link code from the admin
2. Admin generates a new code from the dashboard
3. User tries `/auth <new-code>` on Telegram
4. Authentication should now work without errors

## Prevention
The updated code now prevents this issue by:
1. ✅ Checking for existing Telegram links before saving
2. ✅ Providing clear error messages to users
3. ✅ Preventing multiple accounts from sharing the same Telegram ID
4. ✅ Alerting users if their account is already linked to another Telegram account

## Error Messages Users Will See

### If Telegram account is already linked to another user:
```
❌ Authentication Failed

This Telegram account is already linked to another user (@username).
Please use a different Telegram account or contact support.
```

### If their account is already linked to a different Telegram:
```
❌ Authentication Failed

Your account is already linked to Telegram ID: 123456789.
To relink, please contact support.
```

## Notes
- The `telegramId` field has a unique index in MongoDB, which is correct and should be kept
- Users can only link one Telegram account per TaskQuest account
- Each Telegram account can only be linked to one TaskQuest account
- If relinking is needed, the admin must manually clear the old `telegramId` from the user's account in the database or implement a "unlink" feature

## Alternative: Manual Database Fix
If you prefer to fix the database manually:

```javascript
// Connect to MongoDB and run:
db.users.find({ telegramId: "845713188" })

// Identify which user should keep the link
// Unlink from the other user(s):
db.users.updateOne(
  { _id: ObjectId("the-user-id-to-unlink") },
  { 
    $set: { 
      telegramId: null, 
      telegramUsername: null, 
      telegramLinked: false 
    } 
  }
)
```
