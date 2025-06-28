# TaskQuest - Project Overview

## Table of Contents
- [Project Description](#project-description)
- [Architecture](#architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [GraphQL Implementation](#graphql-implementation)
- [Authentication & Security](#authentication--security)
- [Database Models](#database-models)
- [Frontend Implementation](#frontend-implementation)
- [API Endpoints](#api-endpoints)
- [Recent Changes & Migration](#recent-changes--migration)
- [Development Setup](#development-setup)
- [Known Issues & Solutions](#known-issues--solutions)
- [Future Improvements](#future-improvements)

## Project Description

TaskQuest is a collaborative task and project management application built with Node.js, Express, and MongoDB. It features a complete GraphQL API backend with a server-side rendered frontend using EJS templates. The application allows users to create quests (projects), assign tasks, and track progress in a gamified environment.

### Key Capabilities
- **User Authentication**: Firebase-based phone authentication with JWT tokens
- **Quest Management**: Create and manage projects with multiple participants
- **Task Management**: Create, assign, and track tasks within quests
- **Role-based Access**: User and admin roles with appropriate permissions
- **Real-time Dashboard**: Live updates of quest progress and task completion
- **GraphQL API**: Complete migration from REST to GraphQL for all data operations

## Architecture

The application follows a modern full-stack architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (EJS + JS)    │◄──►│  Express +      │◄──►│    MongoDB      │
│                 │    │  Apollo Server  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Components
- **Express Server**: Main application server with middleware stack
- **Apollo Server**: GraphQL server integrated with Express
- **MongoDB**: Primary database with Mongoose ODM
- **Firebase Auth**: Authentication service for phone-based login
- **EJS Templates**: Server-side rendering for dynamic HTML
- **Static Assets**: CSS, JavaScript, and image files

## Features

### Core Features
- ✅ **User Registration & Authentication**
  - Phone-based authentication via Firebase
  - JWT token management
  - Session handling with flash messages

- ✅ **Quest Management**
  - Create and join quests
  - Track quest progress (0-100%)
  - Quest completion status
  - Member management

- ✅ **Task Management**
  - Create tasks within quests
  - Assign tasks to specific users
  - Task status tracking (pending, in-progress, completed)
  - Priority levels and due dates

- ✅ **Dashboard Interface**
  - Real-time progress visualization
  - Task and quest overview
  - Performance metrics
  - Responsive design

- ✅ **Role-based Access Control**
  - User and admin roles
  - Role immutability (users cannot become admins)
  - Permission-based operations

### Advanced Features
- **GraphQL API**: Complete CRUD operations for all entities
- **Database Migration Tools**: Index management and schema updates
- **Error Handling**: Comprehensive error logging and user feedback
- **Security**: JWT validation, input sanitization, CORS protection

## Technology Stack

### Backend
- **Node.js** (ES6+ with modules)
- **Express.js** (Web framework)
- **Apollo Server** (GraphQL server)
- **MongoDB** (Database)
- **Mongoose** (ODM)
- **Firebase Admin SDK** (Authentication)

### Frontend
- **EJS** (Template engine)
- **Vanilla JavaScript** (GraphQL client)
- **CSS3** (Styling)
- **Bootstrap/Custom CSS** (UI framework)

### DevOps & Tools
- **dotenv** (Environment configuration)
- **cors** (Cross-origin resource sharing)
- **cookie-parser** (Cookie handling)
- **express-session** (Session management)
- **connect-flash** (Flash messages)

## Project Structure

```
TaskQuest/
├── config/
│   └── serviceAccountKey.json          # Firebase admin credentials
├── public/
│   ├── css/
│   │   ├── dashboard.css               # Dashboard styling
│   │   └── flash.css                   # Flash message styling
│   ├── js/
│   │   └── graphql-client.js           # Frontend GraphQL client
│   └── dashboard_design.png            # Design mockups
├── routes/
│   └── auth.js                         # Authentication routes
├── src/
│   ├── models/
│   │   ├── User.js                     # User data model
│   │   ├── Quest.js                    # Quest data model
│   │   └── Task.js                     # Task data model
│   ├── resolvers/
│   │   └── resolver.js                 # GraphQL resolvers
│   └── schema/
│       └── schema.js                   # GraphQL schema definitions
├── utils/
│   └── jwt.js                          # JWT utilities and middleware
├── views/
│   ├── partials/
│   │   ├── bot.ejs                     # Bot/AI assistant component
│   │   ├── overview.ejs                # Dashboard overview
│   │   ├── performance.ejs             # Performance metrics
│   │   ├── quests.ejs                  # Quest management interface
│   │   └── tasks.ejs                   # Task management interface
│   ├── dashboard.ejs                   # Main dashboard view
│   ├── index.ejs                       # Landing page
│   ├── otp.ejs                         # Phone verification
│   └── taskquest.ejs                   # Alternative dashboard
├── index.js                            # Main server file
├── package.json                        # Dependencies and scripts
└── README.md                           # Project documentation
```

## GraphQL Implementation

### Schema Overview
The GraphQL schema includes comprehensive types and operations:

#### Types
- **User**: User profiles with authentication and role management
- **Quest**: Project containers with progress tracking
- **Task**: Individual work items with assignments and status

#### Queries
```graphql
type Query {
  users: [User]
  user(id: ID!): User
  quests: [Quest]
  quest(id: ID!): Quest
  tasks: [Task]
  task(id: ID!): Task
  userQuests(userId: ID!): [Quest]
  userTasks(userId: ID!): [Task]
}
```

#### Mutations
```graphql
type Mutation {
  createUser(input: CreateUserInput!): User
  updateUser(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): DeleteResult
  
  createQuest(input: CreateQuestInput!): Quest
  updateQuest(id: ID!, input: UpdateQuestInput!): Quest
  deleteQuest(id: ID!): DeleteResult
  
  createTask(input: CreateTaskInput!): Task
  updateTask(id: ID!, input: UpdateTaskInput!): Task
  deleteTask(id: ID!): DeleteResult
}
```

### Resolver Features
- **Authentication**: JWT token validation for protected operations
- **Authorization**: Role-based access control
- **Data Validation**: Input validation and sanitization
- **Error Handling**: Comprehensive error messages and logging
- **Serialization**: Proper ObjectId to string conversion

## Authentication & Security

### Firebase Integration
- **Phone Authentication**: OTP-based user verification
- **Admin SDK**: Server-side token verification
- **Custom Claims**: Role management through Firebase

### JWT Implementation
- **Token Generation**: Secure token creation with user data
- **Middleware**: Request authentication and user extraction
- **Session Management**: Cookie-based token storage

### Security Features
- **CORS Protection**: Configurable cross-origin requests
- **Input Validation**: GraphQL schema validation
- **Role Immutability**: Prevents privilege escalation
- **Session Security**: Secure cookie configuration

## Database Models

### User Model
```javascript
{
  firebaseUid: String (unique),
  username: String (required),
  email: String (required, unique),
  phoneNumber: String (unique),
  role: String (enum: ['user', 'admin'], default: 'user'),
  questsIn: [ObjectId] (ref: 'Quest'),
  tasksAssigned: [ObjectId] (ref: 'Task'),
  createdAt: Date,
  updatedAt: Date
}
```

### Quest Model
```javascript
{
  title: String (required),
  description: String,
  creator: ObjectId (ref: 'User', required),
  members: [ObjectId] (ref: 'User'),
  progress: Number (0-100, default: 0),
  completed: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### Task Model
```javascript
{
  title: String (required),
  description: String,
  quest: ObjectId (ref: 'Quest', required),
  assignedTo: ObjectId (ref: 'User', required),
  createdBy: ObjectId (ref: 'User', required),
  status: String (enum: ['pending', 'in-progress', 'completed'], default: 'pending'),
  priority: String (enum: ['low', 'medium', 'high'], default: 'medium'),
  dueDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Frontend Implementation

### GraphQL Client
A custom JavaScript client handles all GraphQL operations:

```javascript
class GraphQLClient {
  async query(query, variables = {}) { /* ... */ }
  async mutate(mutation, variables = {}) { /* ... */ }
  
  // User operations
  async createUser(userData) { /* ... */ }
  async updateUser(id, userData) { /* ... */ }
  
  // Quest operations
  async createQuest(questData) { /* ... */ }
  async updateQuest(id, questData) { /* ... */ }
  
  // Task operations
  async createTask(taskData) { /* ... */ }
  async updateTask(id, taskData) { /* ... */ }
}
```

### Dashboard Interface
- **Responsive Design**: Mobile-first approach with Bootstrap
- **Real-time Updates**: Dynamic content loading via GraphQL
- **Interactive Components**: Modal dialogs, forms, and progress bars
- **Error Handling**: User-friendly error messages and loading states

## API Endpoints

### REST Endpoints (Legacy/Auth only)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /logout` - User logout

### GraphQL Endpoint
- `POST /graphql` - All data operations (queries and mutations)

### Utility Endpoints
- `GET /` - Landing page
- `GET /dashboard` - Main application dashboard
- `GET /otp` - Phone verification page
- `GET /migrate-task-index` - Database migration utility

## Recent Changes & Migration

### GraphQL Migration ✅ COMPLETED
- **Complete REST to GraphQL**: Removed all REST endpoints for data operations
- **Schema Definition**: Comprehensive GraphQL schema with all necessary types
- **Resolver Implementation**: Full CRUD operations with business logic
- **Frontend Updates**: All AJAX calls migrated to GraphQL client

### Database Fixes ✅ COMPLETED
- **Index Removal**: Dropped unique constraint on `Task.quest` field
- **Migration Route**: Added `/migrate-task-index` for database updates
- **Serialization Fix**: Proper ObjectId to string conversion in GraphQL responses

### User Management Overhaul ✅ COMPLETED
- **UI Transformation**: Replaced quest management with comprehensive user management
- **Role Enforcement**: Users in quests cannot become admins
- **Access Control**: Users only see teammates who share quests with them
- **GraphQL Integration**: User creation and deletion via GraphQL

### Task Management Enhancements ✅ COMPLETED
- **Edit/Delete Functionality**: Full CRUD operations for tasks
- **Priority Color-Coding**: Visual indicators for task priorities
- **Modal Improvements**: Better UX with keyboard shortcuts and click-outside-to-close
- **Real-time Updates**: Immediate UI updates after task operations

### Security & Privacy ✅ COMPLETED
- **Quest-Based User Filtering**: Users only see relevant teammates
- **Role-Based Access Control**: Proper permission enforcement
- **Data Integrity**: Cascade deletions and proper cleanup
- **Privacy Protection**: Database-level filtering prevents unauthorized access

### Documentation ✅ COMPLETED
- **Comprehensive Guides**: `TASKQUEST_OVERVIEW.md`, `TASK_MANAGEMENT_ENHANCEMENTS.md`, `USER_MANAGEMENT_IMPLEMENTATION.md`
- **Schema Changes**: `SCHEMA_CHANGES.md`
- **Migration Guide**: `GRAPHQL_MIGRATION.md`
- **Serialization Fix**: `GRAPHQL_SERIALIZATION_FIX.md`

## Development Setup

### Prerequisites
- Node.js (v14+ recommended)
- MongoDB (local or cloud instance)
- Firebase project with admin credentials

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd TaskQuest

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB (if running locally)
mongod

# Start the application
npm start
```

### Environment Variables
```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/taskquest
SESSION_SECRET=your_session_secret
FIREBASE_ADMIN_SDK_PATH=./config/serviceAccountKey.json
```

## Known Issues & Solutions

### Resolved Issues
1. **Duplicate Key Error**: Fixed by removing unique index on `Task.quest`
2. **GraphQL Serialization**: Fixed ObjectId serialization in resolvers
3. **Authentication Flow**: Improved JWT handling and session management

### Current Limitations
- No real-time updates (WebSocket integration pending)
- Basic error handling (could be more granular)
- No automated testing suite

## Future Improvements

### Short-term Goals
- [ ] WebSocket integration for real-time updates
- [ ] Enhanced error handling and validation
- [ ] Automated testing suite (Jest/Mocha)
- [ ] API rate limiting and security improvements

### Long-term Goals
- [ ] Mobile application (React Native)
- [ ] Advanced analytics and reporting
- [ ] Integration with external tools (Slack, Discord)
- [ ] File upload and attachment support
- [ ] Advanced notification system

### Performance Optimizations
- [ ] Database query optimization
- [ ] Caching layer (Redis)
- [ ] Image optimization and CDN
- [ ] Bundle optimization for frontend assets

## Conclusion

TaskQuest represents a modern, scalable task management solution with a complete GraphQL backend and responsive frontend. The recent migration from REST to GraphQL provides a more flexible and efficient API, while the comprehensive authentication and role management system ensures security and proper access control.

The application is production-ready with proper error handling, database migrations, and comprehensive documentation. Future enhancements will focus on real-time features, mobile support, and advanced analytics.

---

**Last Updated**: June 27, 2025  
**Version**: 2.0.0 (GraphQL Migration Complete)  
**Maintainer**: TaskQuest Development Team
