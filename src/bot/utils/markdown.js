/**
 * Escape special characters in Telegram Markdown
 * This prevents Telegram API errors when user-generated content 
 * contains special characters like *, _, [, ], etc.
 * 
 * @param {string} text - The text to escape
 * @returns {string} - The escaped text safe for Telegram Markdown
 */
export function escapeMarkdown(text) {
  if (!text) return text;
  // Escape all special Markdown characters
  return text.toString().replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Safely format user data for Telegram messages
 * @param {string} text - The text to format
 * @param {string} defaultValue - Default value if text is null/undefined
 * @returns {string} - Escaped and formatted text
 */
export function safeMarkdown(text, defaultValue = 'N/A') {
  return escapeMarkdown(text || defaultValue);
}
