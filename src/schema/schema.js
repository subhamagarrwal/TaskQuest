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
  phone: String!
  role: Role!
  performanceScore: Float!
  questsStarted: [Quest!]!
}

type Quest {
  id: ID!
  title: String!
  description: String!
  creator: User!
  members: [User!]!
  tasks: [Task!]!
  createdBy: User!
  createdAt: String!
  updatedAt: String!
}

type Task {
  id: ID!
  title: String!
  description: String!
  completed: Boolean!
  assignedTo: User!
  quest: Quest!
  priority: Priority!
  createdBy: User!
  createdAt: String!
  updatedAt: String!
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
  createUser(username: String!, email: String!, phone: String!, role: Role!): User!
  updateUser(id: ID!, username: String, email: String, phone: String, role: Role): User!
  deleteUser(id: ID!): User!
  createQuest(title: String!, description: String!, creatorId: ID!): Quest!
  updateQuest(id: ID!, title: String, description: String, members: [ID!]): Quest!
  deleteQuest(id: ID!): Quest! 
}
`;

export default typeDefs;