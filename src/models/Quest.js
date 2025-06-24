import mongoose from 'mongoose';

const {Schema, model} = mongoose;

const questSchema = new Schema({
    title: {type: String, required: true},
    description : {type: String},
    creator: {
        type:Schema.Types.ObjectId, ref: 'User', required: true
    },
    members: [{
        type: Schema.Types.ObjectId, ref: 'User'
    }],
    tasks: [{
        type: Schema.Types.ObjectId, ref: 'Task'
    }],
    createdBy: {
        type: Schema.Types.ObjectId, ref: 'User', required: true
    }
}
, {
    timestamps: true
});

const Quest = model('Quest', questSchema);
export default Quest;