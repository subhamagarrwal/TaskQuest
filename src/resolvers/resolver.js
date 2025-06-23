const resolvers = {
  Query: {
    users: () => [],
    user: (_, { id }) => null,
    quests: () => [],
    quest: (_, { id }) => null,
    tasks: () => [],
    task: (_, { id }) => null,
  },
};

export default resolvers;
