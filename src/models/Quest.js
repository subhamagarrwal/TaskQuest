import mongoose from 'mongoose';

const {Schema, model} = mongoose;

const questSchema = new Schema({
    title: {type: String, required: true},
    description: {type: String, default: ''},
    progress: {type: Number, default: 0, min: 0, max: 100},
    completed: {type: Boolean, default: false},
    creator: {
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true
    },
    members: [{
        type: Schema.Types.ObjectId, 
        ref: 'User'
    }],
    tasks: [{
        type: Schema.Types.ObjectId, 
        ref: 'Task'
    }]
}, {
    timestamps: true
});

const Quest = model('Quest', questSchema);
export default Quest;