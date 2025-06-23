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
`;

export default typeDefs;