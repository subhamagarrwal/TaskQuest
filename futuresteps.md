# 🧩 TaskQuest – Project Flow

## 1. 🏠 Landing Page
- Welcome message
- Options to log in:
  - 📱 Phone Login (via Firebase SMS OTP)
  - 📧 Email Login (via Google Auth)

---

## 2. 🔐 Login

### a. Phone Login
- Implemented using Firebase Authentication (SMS OTP)

### b. Email Login
- Google OAuth2 using Google Client ID

---

## 3. 📋 Dashboard (Post-Login)
- Displays:
  - User’s past tasks/items
- Actions:
  - Create a new task

---

## 4. 🛠️ Create Task
User inputs:
- Task Name
- Number of Participants
- Time of Completion
- Email Addresses of Participants

Each task is assigned a unique **abbreviation**, e.g.:
- `task1`, `task2`, ...

---

## 5. 📤 Send Invites
- Invite link is shared via:
  - Email
  - Telegram

---

## 6. 🤖 Telegram Bot Integration (via BotFather)
- Users join a Telegram group/chat with the bot
- Bot listens for commands:
  - Example: `task1 done`, `task3 done`

### Flow:
1. Bot receives the message
2. Parses task abbreviation + status
3. Backend (Node.js + Express) receives this via webhook
4. Database is updated for that task & user

---

## 7. ✅ Task Completion & Reporting

### Conditions:
- All participants mark task as done **OR**
- Admin manually triggers completion

### Actions:
- "Generate Report" button appears on dashboard
- Backend generates a **PDF report**:
  - Task details
  - Participants
  - Completion status

- Report can be:
  - Downloaded
  - Emailed
  - Sent via Telegram

---

## 8. ⏰ Daily Reminders (Optional/Future)
- Bot sends daily reminders about:
  - Pending tasks
  - Upcoming deadlines

---

## 🧠 Implementation Notes

- **Telegram Bot**:  
  Use `node-telegram-bot-api`  
  Setup webhook endpoint in Express

- **Task Abbreviations**:  
  Store mapping of `taskX` → `taskId` in DB

- **PDF Generation**:  
  Use `pdfkit` or `puppeteer`

- **Database Models**:
  - Users
  - Tasks
  - Task Status
  - Telegram User IDs (mapping)

- **Security**:
  - Authenticate Telegram users
  - Ensure only **invited participants** can update task status

---

## 🧪 Example Telegram Command Flow

