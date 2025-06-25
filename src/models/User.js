import mongoose from 'mongoose';
import Quest from './Quest.js'; 
const {Schema, model} = mongoose;

const userSchema = new Schema({
    username : {type: String, required: true, unique: true},
    email :    {type: String, required: true, unique: true},
    phone :    {type: String, unique: true},
    role  :    {type: String, enum: ['ADMIN', 'USER'], default: 'USER'},
    performanceScore: {type: Number, default: 0},
    questsIn : [{
        type: Schema.Types.ObjectId,
        ref: 'Quest'
    }]
    },
    
    {
        timestamps: true
    });

const User = model('User', userSchema);
export default User;