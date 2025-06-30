import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const botCommandSchema = new Schema({
    command: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    responseMessage: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    category: {
        type: String,
        enum: ['AUTH', 'TASK_MANAGEMENT', 'INFO', 'UTILITY'],
        default: 'UTILITY'
    },
    parameters: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for faster queries (command already has unique index from schema)
botCommandSchema.index({ isActive: 1 });

const BotCommand = model('BotCommand', botCommandSchema);

export default BotCommand;
