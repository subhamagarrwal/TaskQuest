// GraphQL Client for TaskQuest Frontend
class GraphQLClient {
  constructor(endpoint = '/graphql') {
    this.endpoint = endpoint;
  }

  // Get auth token from cookies
  getAuthToken() {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
    return token;
  }

  // Make GraphQL request
  async request(query, variables = {}) {
    const token = this.getAuthToken();
    
    try {
      console.log('📡 Making GraphQL request:', { query: query.substring(0, 100) + '...', variables });
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      const result = await response.json();
      console.log('📡 GraphQL response:', result);
      
      if (result.errors && result.errors.length > 0) {
        console.error('GraphQL Errors:', result.errors);
        throw new Error(result.errors[0].message || 'GraphQL error occurred');
      }
      
      if (!result.data) {
        console.error('No data in GraphQL response:', result);
        throw new Error('No data returned from GraphQL');
      }
      
      return result.data;
    } catch (error) {
      console.error('GraphQL Request Error:', error);
      throw error;
    }
  }

  // Quest operations
  async createQuest(title, description) {
    const query = `
      mutation CreateQuest($title: String!, $description: String, $creatorId: ID!) {
        createQuest(title: $title, description: $description, creatorId: $creatorId) {
          id
          title
          description
          creator {
            id
            username
          }
          members {
            id
            username
          }
          createdAt
        }
      }
    `;
    
    // Get current user ID and ensure it's a string
    const userId = this.getCurrentUserId();
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const variables = {
      title: String(title),
      description: String(description || ''),
      creatorId: String(userId)
    };
    
    console.log('🎯 Creating quest with variables:', variables);
    
    return this.request(query, variables);
  }

  async updateQuest(id, title, description, members) {
    const query = `
      mutation UpdateQuest($id: ID!, $title: String, $description: String, $members: [ID!]) {
        updateQuest(id: $id, title: $title, description: $description, members: $members) {
          id
          title
          description
          members {
            id
            username
          }
        }
      }
    `;
    
    return this.request(query, {
      id,
      title,
      description,
      members
    });
  }

  async deleteQuest(id) {
    const query = `
      mutation DeleteQuest($id: ID!) {
        deleteQuest(id: $id) {
          id
          title
        }
      }
    `;
    
    return this.request(query, { id });
  }

  // Task operations
  async createTask(title, description, questId, priority = 'MEDIUM', assignedTo) {
    const query = `
      mutation CreateTask($title: String!, $description: String, $questId: ID!, $priority: Priority, $assignedTo: ID!, $createdBy: ID!) {
        createTask(title: $title, description: $description, questId: $questId, priority: $priority, assignedTo: $assignedTo, createdBy: $createdBy) {
          id
          title
          description
          priority
          completed
          assignedTo {
            id
            username
          }
          quest {
            id
            title
          }
          createdBy {
            id
            username
          }
          createdAt
        }
      }
    `;
    
    const userId = this.getCurrentUserId();
    
    // Ensure all IDs are strings
    const variables = {
      title: String(title),
      description: String(description || ''),
      questId: String(questId),
      priority: String(priority),
      assignedTo: String(assignedTo || userId),
      createdBy: String(userId)
    };
    
    console.log('📝 Creating task with variables:', variables);
    
    return this.request(query, variables);
  }

  async updateTask(id, title, description, completed, priority) {
    const query = `
      mutation UpdateTask($id: ID!, $title: String, $description: String, $completed: Boolean, $priority: Priority) {
        updateTask(id: $id, title: $title, description: $description, completed: $completed, priority: $priority) {
          id
          title
          description
          completed
          priority
          assignedTo {
            id
            username
          }
          quest {
            id
            title
          }
        }
      }
    `;
    
    return this.request(query, {
      id,
      title,
      description,
      completed,
      priority
    });
  }

  async deleteTask(id) {
    const query = `
      mutation DeleteTask($id: ID!) {
        deleteTask(id: $id) {
          id
          title
        }
      }
    `;
    
    return this.request(query, { id });
  }

  // Query operations
  async getQuests() {
    const query = `
      query GetQuests {
        quests {
          id
          title
          description
          creator {
            id
            username
          }
          members {
            id
            username
          }
          tasks {
            id
            title
            completed
          }
          createdAt
        }
      }
    `;
    
    return this.request(query);
  }

  async getTasks() {
    const query = `
      query GetTasks {
        tasks {
          id
          title
          description
          completed
          priority
          assignedTo {
            id
            username
          }
          quest {
            id
            title
          }
          createdBy {
            id
            username
          }
          createdAt
        }
      }
    `;
    
    return this.request(query);
  }

  async getUsers() {
    const query = `
      query GetUsers {
        users {
          id
          username
          email
          role
        }
      }
    `;
    
    return this.request(query);
  }

  // Helper method to get current user ID (implement based on your auth system)
  getCurrentUserId() {
    // This should be set by the server when rendering the page
    const userId = window.currentUserId || localStorage.getItem('userId') || null;
    return userId ? String(userId) : null;
  }
}

// Create global instance
window.graphqlClient = new GraphQLClient();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphQLClient;
}
