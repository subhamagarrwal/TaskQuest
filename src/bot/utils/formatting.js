export const formatTaskList = (tasks) => {
    if (!tasks || tasks.length === 0) {
        return 'You have no tasks assigned.';
    }

    return tasks.map((task, index) => {
        return `${index + 1}. ${task.title} - Status: ${task.completed ? '✅ Completed' : '❌ In Progress'}`;
    }).join('\n');
};

export const formatTaskUpdateMessage = (task) => {
    return `Task Update:\nTitle: ${task.title}\nStatus: ${task.completed ? '✅ Completed' : '❌ In Progress'}`;
};

export const formatWelcomeMessage = (username) => {
    return `Welcome, ${username}! Use /help to see available commands.`;
};

export const formatErrorMessage = (error) => {
    return `⚠️ Error: ${error.message || 'An unexpected error occurred.'}`;
};