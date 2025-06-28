const typeDefs = `#graphql

enum Role {
  ADMIN
  USER
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

type User {
  id: ID!
  username: String!
  email: String!
  phone: String
  role: Role!
  performanceScore: Float!
  questsIn: [Quest!]!
  firebaseUid: String
  isFirstUser: Boolean
  createdAt: String!
  updatedAt: String!
}

type Quest {
  id: ID!
  title: String!
  description: String
  progress: Float!
  completed: Boolean!
  completionDate: String
  creator: User!
  members: [User!]!
  tasks: [Task!]!
  createdBy: User!
  inviteCode: String
  inviteCodeExpires: String
  maxMembers: Int
  isActive: Boolean
  createdAt: String!
  updatedAt: String!
}

type Task {
  id: ID!
  title: String!
  description: String
  completed: Boolean!
  assignedTo: User!
  quest: Quest!
  priority: Priority!
  createdBy: User!
  createdAt: String!
  updatedAt: String!
}

type InviteCodeResponse {
  success: Boolean!
  inviteCode: String
  botLink: String
  expiresAt: String
}

type AutoGenerateResponse {
  success: Boolean!
  message: String!
  updatedCount: Int!
}

type Query {
  users: [User!]!
  user(id: ID!): User
  quests: [Quest!]!
  quest(id: ID!): Quest
  tasks: [Task!]!
  task(id: ID!): Task
}

type Mutation {
  createUser(username: String!, email: String!, phone: String, role: Role!, firebaseUid: String): User!
  updateUser(id: ID!, username: String, email: String, phone: String, firebaseUid: String): User!
  deleteUser(id: ID!): User!
  createQuest(title: String!, description: String, completionDate: String, creatorId: ID!): Quest!
  updateQuest(id: ID!, title: String, description: String, completionDate: String, members: [ID!]): Quest!
  deleteQuest(id: ID!): Quest!
  createTask(title: String!, description: String, assignedTo: ID!, questId: ID!, priority: Priority, createdBy: ID!): Task!
  updateTask(id: ID!, title: String, description: String, completed: Boolean, priority: Priority, assignedTo: ID): Task!
  deleteTask(id: ID!): Task!
  generateQuestInviteCode(questId: ID!, expiresInHours: Int, maxMembers: Int): InviteCodeResponse!
  autoGenerateInviteCodes: AutoGenerateResponse!
}
`;

export default typeDefs;