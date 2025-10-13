# Leave Quest Error Fix

## Problem
When users tried to leave a quest via Telegram, they got this error:
```
Cast to ObjectId failed for value "845713188" (type number) at path "assignedTo" for model "Task"
```

## Root Cause
The `removeUserFromQuest()` function in `taskService.js` was receiving a Telegram ID (a number like `845713188`) and trying to use it directly to query the `Task` model's `assignedTo` field, which expects a MongoDB ObjectId.

### Issue Flow:
1. User clicks "Leave Quest" button in Telegram
2. `callbackHandler.js` calls `removeUserFromQuest(ctx.from.id)` - passes Telegram ID
3. `taskService.js` tried to use this Telegram ID directly in `Task.updateMany({ assignedTo: userId })`
4. MongoDB rejected it because `assignedTo` is a reference to the User model's `_id` (ObjectId), not a Telegram ID

## Solution

### Fixed `removeUserFromQuest()` in `taskService.js`

**Before:**
```javascript
export const removeUserFromQuest = async (userId) => {
  // Used userId (Telegram ID) directly - WRONG!
  await Task.updateMany(
    { assignedTo: userId },  // ❌ userId is Telegram ID, not ObjectId
    { $pull: { assignedTo: userId } }
  );
  
  const user = await User.findOne({ telegramId: userId });
  // ...
};
```

**After:**
```javascript
export const removeUserFromQuest = async (telegramId) => {
  // Step 1: Find user by Telegram ID to get MongoDB ObjectId
  const user = await User.findOne({ telegramId: telegramId.toString() });
  
  if (!user) {
    return false;
  }
  
  // Step 2: Use the correct ObjectId for task updates
  await Task.updateMany(
    { assignedTo: user._id },  // ✅ Using MongoDB ObjectId
    { $unset: { assignedTo: "" } }
  );
  
  // Step 3: Remove user from quest members
  await Quest.updateMany(
    { _id: { $in: user.questsIn } },
    { $pull: { members: user._id } }
  );
  
  // Step 4: Clear user's quest list
  user.questsIn = [];
  await user.save();
  
  return true;
};
```

## Key Changes

1. **Renamed parameter** from `userId` to `telegramId` for clarity
2. **Find user first** to get their MongoDB `_id` (ObjectId)
3. **Use `user._id`** for all database queries instead of Telegram ID
4. **Proper cleanup**:
   - Unassign user from all their tasks
   - Remove user from quest member lists
   - Clear user's quest associations

## Testing
Now when a user clicks "Leave Quest" in Telegram:
- ✅ Their tasks are properly unassigned
- ✅ They are removed from quest member lists
- ✅ Their profile is cleaned up
- ✅ No more ObjectId cast errors

## Related Files
- `src/services/taskService.js` - Fixed the `removeUserFromQuest()` function
- `src/bot/handlers/callbackHandler.js` - Calls the function (no changes needed)

## Why This Matters
MongoDB models use ObjectIds for references between documents. When working with Telegram integration:
- **Telegram IDs** are unique identifiers from Telegram (numbers)
- **MongoDB ObjectIds** are unique identifiers in the database
- Always convert Telegram IDs to MongoDB ObjectIds before querying referenced fields

## Status
✅ **Fixed and Working!**

Users can now successfully leave quests from the Telegram bot without errors.
