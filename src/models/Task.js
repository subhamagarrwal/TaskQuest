import mongoose from 'mongoose';
const {Schema, model} = mongoose;

const taskSchema = new Schema({
    title : {type: String, required: true},
    description: {type: String},
    completed: {type: Boolean, default: false},
    status: {
        type: String, 
        enum: ['not_started', 'in_progress', 'completed'], 
        default: 'not_started'
    },
    assignedTo: {
        type: Schema.Types.ObjectId, ref: 'User', required: true
    },
    quest: {
        type: Schema.Types.ObjectId, 
        ref: 'Quest', 
        required: true
        // Removed unique constraint to allow multiple tasks per quest
        // But each task can only belong to one quest (enforced by the field itself)
    },
    priority : {type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM'},
    deadline: {type: Date, required: false}, // Task deadline
    createdBy: {
        type: Schema.Types.ObjectId, ref: 'User', required: true   
    }},
     
    {
        timestamps: true
    });

// Add compound index to ensure efficient queries
taskSchema.index({ quest: 1, assignedTo: 1 });
taskSchema.index({ assignedTo: 1, completed: 1 });

// Pre-save middleware to ensure task-quest relationship integrity and sync completed field
taskSchema.pre('save', async function(next) {
    try {
        if (this.isModified('quest') && !this.isNew) {
            // Prevent changing quest assignment after task creation
            const error = new Error('Quest assignment cannot be changed after task creation');
            error.name = 'ValidationError';
            return next(error);
        }
        
        // Validate task deadline against quest completion date
        if (this.deadline && this.quest) {
            const Quest = this.model('Quest');
            const quest = await Quest.findById(this.quest).select('completionDate');
            
            if (quest && quest.completionDate && this.deadline > quest.completionDate) {
                const error = new Error('Task deadline cannot exceed quest completion date');
                error.name = 'ValidationError';
                return next(error);
            }
        }
        
        // Sync completed field with status
        if (this.isModified('status')) {
            this.completed = this.status === 'completed';
        }
        
        // Also sync status field when completed is modified
        if (this.isModified('completed') && !this.isModified('status')) {
            this.status = this.completed ? 'completed' : 'not_started';
        }
        
        next();
    } catch (error) {
        next(error);
    }
});
const Task = model('Task', taskSchema);
export default Task;