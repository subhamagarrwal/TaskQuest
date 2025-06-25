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
  - User's past tasks/items
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

---

## 🚦 Integrating Redis & BullMQ for Background Jobs and Scheduling

### Why Use Redis & BullMQ?
- Offload heavy or slow tasks (like sending notifications, generating PDFs, reminders) to background workers.
- Improve user experience (API responds instantly, work happens in the background).
- Enable scheduled/repeatable jobs (e.g., daily reminders).
- Scalable (add more workers as your app grows).

### Example Use Cases in TaskQuest
- **Notifications:** Send emails, Telegram, or WhatsApp messages when tasks are completed or assigned.
- **PDF Generation:** Generate reports in the background and notify users when ready.
- **Daily Reminders:** Schedule reminders for pending tasks using repeatable jobs.

### How to Integrate

1. **Install Dependencies**
   ```bash
   npm install bullmq ioredis
   ```
2. **Set Up Redis**
   - Ensure a Redis server is running (locally or in the cloud).

3. **Create a Queue (e.g., for Notifications)**
   ```js
   // queues/notificationQueue.js
   import { Queue } from 'bullmq';
   import IORedis from 'ioredis';
   const connection = new IORedis();
   export const notificationQueue = new Queue('notifications', { connection });
   ```

4. **Add Jobs to the Queue**
   ```js
   import { notificationQueue } from '../queues/notificationQueue.js';
   await notificationQueue.add('send', {
     type: 'telegram',
     userId: '123',
     message: 'Task completed!',
   });
   ```

5. **Create a Worker to Process Jobs**
   ```js
   // workers/notificationWorker.js
   import { Worker } from 'bullmq';
   import IORedis from 'ioredis';
   const connection = new IORedis();
   const worker = new Worker('notifications', async job => {
     if (job.name === 'send') {
       // Implement notification logic here
       console.log(`Sending ${job.data.type} to user ${job.data.userId}: ${job.data.message}`);
     }
   }, { connection });
   worker.on('completed', job => {
     console.log(`Job ${job.id} completed`);
   });
   ```
   - Run this worker in a separate process: `node workers/notificationWorker.js`

6. **Schedule Daily Reminders**
   ```js
   await notificationQueue.add('send', {
     type: 'reminder',
     message: 'You have pending tasks!',
   }, {
     repeat: { cron: '0 9 * * *' } // every day at 9am
   });
   ```

### Folder Structure Suggestion
```
/queues
  notificationQueue.js
/workers
  notificationWorker.js
```

### Monitoring (Optional)
- Use [Arena](https://github.com/bee-queue/arena) or [Bull Board](https://github.com/vcapretz/bull-board) for a web UI to monitor your queues.

---

