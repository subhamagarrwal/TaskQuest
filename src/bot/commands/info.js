import { getTasksByUserId } from '../../services/taskService.js';
import { getUserRole } from '../../services/taskService.js';

export default async function infoCommand(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    
    try {
        // Get user's tasks and role information
        const tasks = await getTasksByUserId(userId);
        const userRole = await getUserRole(userId);
        
        let infoMessage = `
📋 *Your Quest Information*

👤 *User:* ${username}
🎭 *Role:* ${userRole || 'Not assigned'}

*Your Tasks:*
`;
        
        if (tasks && tasks.length > 0) {
            tasks.forEach((task, index) => {
                infoMessage += `
${index + 1}. *${task.title}*
   📝 ${task.description}
   📊 Status: ${task.status}
   📅 Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
`;
            });
        } else {
            infoMessage += `
No tasks assigned yet.`;
        }
        
        infoMessage += `

💡 *Need more details about a specific task?* Use /task <task_number> for detailed information.`;
        
        await ctx.reply(infoMessage, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error fetching user info:', error);
        await ctx.reply('❌ There was an error fetching your information. Please try again later.');
    }
}
