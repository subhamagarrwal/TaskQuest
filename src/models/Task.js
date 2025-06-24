import mongoose from 'mongoose';
const {Schema, model} = mongoose;

const taskSchema = new Schema({
    title : {type: String, required: true},
    description: {type: String},
    completed: {type: Boolean, default: false},
    assignedTo: {
        type: Schema.Types.ObjectId, ref: 'User', required: true
    },
    quest: {
        type: Schema.Types.ObjectId, ref: 'Quest', required: true, unique :true
    },
    priority : {type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM'},
    createdBy: {
        type: Schema.Types.ObjectId, ref: 'User', required: true   
    }},
     
    {
        timestamps: true
    });
const Task = model('Task', taskSchema);
export default Task;