import mongoose from 'mongoose';
import Quest from './Quest.js'; 
const {Schema, model} = mongoose;

const userSchema = new Schema({
    username : {type: String, required: true, unique: true},
    email :    {type: String, required: true, unique: true},
    phone :    {type: String, unique: true, sparse: true},        // <-- add sparse: true
    role  :    {type: String, enum: ['ADMIN', 'USER'], default: 'ADMIN'},
    performanceScore: {type: Number, default: 0},
    questsIn : [{
        type: Schema.Types.ObjectId,
        ref: 'Quest'
    }],
    firebaseUid: { type: String, unique: true, sparse: true }     // <-- add this line
},
{
    timestamps: true
});
const User = model('User', userSchema);
export default User;