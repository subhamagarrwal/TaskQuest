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

      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error:', response.status, response.statusText, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Non-JSON response:', responseText.substring(0, 200));
        throw new Error('Server returned non-JSON response. Check if GraphQL server is running.');
      }

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

  // User operations
  async createUser(username, email, phone, role) {
    const query = `
      mutation CreateUser($username: String!, $email: String!, $phone: String, $role: Role!) {
        createUser(username: $username, email: $email, phone: $phone, role: $role) {
          id
          username
          email
          phone
          role
          isFirstUser
          createdAt
        }
      }
    `;
    
    const variables = {
      username: String(username),
      email: String(email),
      phone: phone ? String(phone) : null,
      role: String(role)
    };
    
    console.log('👤 Creating user with variables:', variables);
    
    return this.request(query, variables);
  }

  async deleteUser(id) {
    const query = `
      mutation DeleteUser($id: ID!) {
        deleteUser(id: $id) {
          id
          username
        }
      }
    `;
    
    return this.request(query, { id: String(id) });
  }

  async updateUser(id, username, email, phone) {
    const query = `
      mutation UpdateUser($id: ID!, $username: String!, $email: String!, $phone: String) {
        updateUser(id: $id, username: $username, email: $email, phone: $phone) {
          id
          username
          email
          phone
          role
          createdAt
        }
      }
    `;
    
    const variables = {
      id: String(id),
      username: String(username),
      email: String(email),
      phone: phone ? String(phone) : null
    };
    
    console.log('✏️ Updating user with variables:', variables);
    
    return this.request(query, variables);
  }

  // Quest operations
  async createQuest(title, description, completionDate) {
    const query = `
      mutation CreateQuest($title: String!, $description: String, $completionDate: String, $creatorId: ID!) {
        createQuest(title: $title, description: $description, completionDate: $completionDate, creatorId: $creatorId) {
          id
          title
          description
          completionDate
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
      completionDate: completionDate ? String(completionDate) : null,
      creatorId: String(userId)
    };
    
    console.log('🎯 Creating quest with variables:', variables);
    
    return this.request(query, variables);
  }

  async updateQuest(id, title, description, completionDate, members) {
    const query = `
      mutation UpdateQuest($id: ID!, $title: String, $description: String, $completionDate: String, $members: [ID!]) {
        updateQuest(id: $id, title: $title, description: $description, completionDate: $completionDate, members: $members) {
          id
          title
          description
          completionDate
          members {
            id
            username
          }
        }
      }
    `;
    
    return this.request(query, {
      id: String(id),
      title: title ? String(title) : undefined,
      description: description ? String(description) : undefined,
      completionDate: completionDate ? String(completionDate) : null,
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
  async createTask(title, description, questId, priority = 'MEDIUM', assignedTo, deadline = null) {
    const query = `
      mutation CreateTask($title: String!, $description: String, $questId: ID!, $priority: Priority, $assignedTo: ID!, $deadline: String, $createdBy: ID!) {
        createTask(title: $title, description: $description, questId: $questId, priority: $priority, assignedTo: $assignedTo, deadline: $deadline, createdBy: $createdBy) {
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
      deadline: deadline || null,
      createdBy: String(userId)
    };
    
    console.log('📝 Creating task with variables:', variables);
    
    return this.request(query, variables);
  }

  async updateTask(id, title, description, completed, priority, deadline, assignedTo) {
    const query = `
      mutation UpdateTask($id: ID!, $title: String, $description: String, $completed: Boolean, $priority: Priority, $deadline: String, $assignedTo: ID) {
        updateTask(id: $id, title: $title, description: $description, completed: $completed, priority: $priority, deadline: $deadline, assignedTo: $assignedTo) {
          id
          title
          description
          completed
          priority
          deadline
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
    
    const variables = {
      id: String(id),
      title,
      description,
      completed,
      priority,
      deadline: deadline || null,
      assignedTo: assignedTo ? String(assignedTo) : undefined
    };
    
    console.log('📝 Updating task with variables:', variables);
    
    return this.request(query, variables);
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
