# Markdown to HTML Conversion Fix

## Problem
Persistent Markdown parsing errors in Telegram bot:
```
Bad Request: can't parse entities: Can't find end of the entity starting at byte offset 334
```

## Root Cause
Telegram's Markdown parser is extremely strict and fragile:
- Special characters in user-generated content (task titles, usernames) cause parsing failures
- Backticks, asterisks, and other Markdown syntax can create ambiguous parsing situations
- Even with escaping, certain character combinations still cause errors

## Solution: Switch to HTML Parse Mode

HTML parsing is **much more robust and forgiving** than Markdown:
- ✅ Explicit tags like `<b>`, `<i>`, `<code>` are unambiguous
- ✅ Only need to escape 3 characters: `<`, `>`, `&`
- ✅ No issues with asterisks, underscores, backticks, etc.
- ✅ More predictable behavior with user-generated content

## Changes Made

### 1. Convert All Formatting
**Before (Markdown):**
```javascript
message += `*Admin Dashboard*\n`;
message += `*Quest Overview:*\n`;
message += `\`/auth <code>\`\n`;
```

**After (HTML):**
```javascript
message += `<b>Admin Dashboard</b>\n`;
message += `<b>Quest Overview:</b>\n`;
message += `<code>/auth &lt;code&gt;</code>\n`;
```

### 2. HTML Escape Function
```javascript
const htmlEscape = (text) => {
  return text.replace(/[<>&]/g, (c) => {
    return {'<':'&lt;', '>':'&gt;', '&':'&amp;'}[c];
  });
};

// Usage
const safeTitle = htmlEscape(task.title);
const safeUsername = htmlEscape(task.assignedTo?.username || 'Unassigned');
```

### 3. Update Parse Mode
```javascript
// Before
await ctx.reply(message, { parse_mode: 'Markdown' });

// After
await ctx.reply(message, { parse_mode: 'HTML' });
```

## HTML Formatting Reference

### Supported Tags
- `<b>text</b>` - **Bold text**
- `<i>text</i>` - *Italic text*
- `<u>text</u>` - <u>Underlined text</u>
- `<s>text</s>` - ~~Strikethrough~~
- `<code>text</code>` - `Inline code`
- `<pre>text</pre>` - Code block
- `<a href="url">text</a>` - [Link](url)

### HTML Entities to Escape
Only 3 characters need escaping:
```javascript
< → &lt;
> → &gt;
& → &amp;
```

## Benefits

### Before (Markdown Issues):
- ❌ Task title "test_file" → parsing error with underscore
- ❌ Username "user*name" → parsing error with asterisk  
- ❌ Description with `code` → parsing error with backticks
- ❌ Text with "can't" → issues with apostrophe in certain contexts
- ❌ File names ".env" → issues with dots and special chars

### After (HTML - No Issues):
- ✅ All special characters work fine when escaped
- ✅ User-generated content is safe
- ✅ Predictable and reliable rendering
- ✅ No more parsing errors

## Files Modified
- `src/bot/commands/tasks.js` - Converted all messages to HTML format

## Testing

### Test with Special Characters
```
Task Title: "Test * with _ special # chars"
Username: "user_name*123"
Description: "Code: `test` & more"
```

**Result:** ✅ All display correctly without errors!

### Test Formatting
```
<b>Bold text</b>
<i>Italic text</i>
<code>Code text</code>
Emojis: 🎉 ✅ 🔥
```

**Result:** ✅ All format properly!

## Migration Guide for Other Commands

If other commands have similar Markdown errors, convert them using:

```javascript
// 1. Replace asterisks with <b> tags
*text* → <b>text</b>

// 2. Replace backticks with <code> tags
`code` → <code>code</code>

// 3. Escape HTML special chars in user data
const safe = text.replace(/[<>&]/g, (c) => ({'<':'&lt;', '>':'&gt;', '&':'&amp;'}[c]));

// 4. Change parse mode
{ parse_mode: 'Markdown' } → { parse_mode: 'HTML' }
```

## Status
✅ **Fixed and Working!**

The `/tasks` command now uses HTML formatting and handles all user-generated content safely without any parsing errors.

## Recommendation
Consider converting all bot commands to HTML parse mode for consistency and reliability.
