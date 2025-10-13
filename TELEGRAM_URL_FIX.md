# Telegram Bot URL Configuration Fix

## Problem
Telegram bot was showing this error when users tried to view tasks:
```
TelegramError: 400: Bad Request: inline keyboard button URL 'http://localhost:4000/dashboard' is invalid: Wrong HTTP URL
```

## Root Cause
- Telegram API **does NOT accept localhost URLs** in inline keyboard buttons
- The bot code was using `process.env.FRONTEND_URL || 'http://localhost:4000'` as a fallback
- When `FRONTEND_URL` wasn't set in .env, it defaulted to localhost, causing the error

## Solution Implemented

### 1. Updated Bot Commands
Modified the following files to only show inline keyboard buttons when a valid public URL is configured:

- **`src/bot/commands/tasks.js`** - Admin dashboard button
- **`src/bot/commands/auth.js`** - Quest dashboard notification to admin
- **`src/bot/commands/info.js`** - Profile dashboard buttons

### 2. Smart URL Validation
The code now checks:
```javascript
if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
    // Only add inline keyboard button if URL is valid
}
```

### 3. Updated .env Configuration
Added comments in `.env` file explaining how to configure `FRONTEND_URL`

## How to Use

### Option 1: No Public URL (Development)
- Leave `FRONTEND_URL` unset or commented out in `.env`
- Bot will work normally but without dashboard buttons
- Users will see helpful messages instead

### Option 2: With Public URL (Production)
Add to your `.env` file:
```env
FRONTEND_URL=https://yourdomain.com
# or
FRONTEND_URL=https://your-app.onrender.com
# or any other publicly accessible HTTPS URL
```

**Requirements:**
- ✅ Must be a publicly accessible URL (not localhost)
- ✅ Should use HTTPS (Telegram preference)
- ❌ Cannot be localhost, 127.0.0.1, or internal IP
- ❌ Cannot be HTTP (though may work, HTTPS is recommended)

## Testing

### After Restart
1. Restart your bot application
2. Try `/tasks` command in Telegram
3. Results:
   - **Without FRONTEND_URL**: Works perfectly, shows tasks without dashboard button
   - **With valid FRONTEND_URL**: Shows tasks with clickable dashboard button

### Example Valid URLs
```env
# Deployed on Render
FRONTEND_URL=https://taskquest.onrender.com

# Deployed on Heroku
FRONTEND_URL=https://taskquest-app.herokuapp.com

# Custom domain
FRONTEND_URL=https://taskquest.yourdomain.com

# Ngrok tunnel (for temporary testing)
FRONTEND_URL=https://abc123.ngrok.io
```

## Current Status
✅ **Bot now works without FRONTEND_URL configured**
- All commands function properly
- No more Telegram API errors
- Dashboard buttons only appear when valid URL is set

## Next Steps

### If You Want Dashboard Links:
1. Deploy your frontend to a hosting service (Render, Vercel, Netlify, Heroku, etc.)
2. Get the public URL
3. Add it to `.env` as `FRONTEND_URL=https://your-url.com`
4. Restart the bot
5. Dashboard buttons will automatically appear

### If You're Fine Without Dashboard Links:
- Nothing to do! Bot works perfectly as-is
- Users can still use all bot commands
- Admin functionality works through bot commands

## Related Files Changed
- `src/bot/commands/tasks.js` - Line 77
- `src/bot/commands/auth.js` - Line 417
- `src/bot/commands/info.js` - Lines 101, 114
- `.env` - Added FRONTEND_URL documentation

## Notes
- The webhook.js file still has localhost for GraphQL, but that's internal server communication (not Telegram-related)
- If you deploy your app, remember to update all localhost references in your config
