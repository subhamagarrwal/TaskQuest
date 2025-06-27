import mongoose from 'mongoose';
import Quest from './Quest.js'; 
const {Schema, model} = mongoose;

const userSchema = new Schema({
    username : {type: String, required: true, unique: true},
    email :    {type: String, required: true, unique: true},
    phone :    {type: String, unique: true, sparse: true},
    role  :    {type: String, enum: ['ADMIN', 'USER'], default: 'USER', immutable: function() {
        // Make role immutable after creation - prevents role changes
        return this.isModified('role') && !this.isNew;
    }},
    performanceScore: {type: Number, default: 0},
    questsIn : [{
        type: Schema.Types.ObjectId,
        ref: 'Quest'
    }],
    firebaseUid: { type: String, unique: true, sparse: true },
    isFirstUser: { type: Boolean, default: false } // Track if this is the very first user (for admin privileges)
},
{
    timestamps: true
});

// Pre-save middleware to enforce role rules
userSchema.pre('save', async function(next) {
    try {
        // If this is a new user being created
        if (this.isNew) {
            // Check if this is the very first user in the system
            const userCount = await this.constructor.countDocuments();
            
            if (userCount === 0) {
                // First user becomes admin automatically
                this.role = 'ADMIN';
                this.isFirstUser = true;
            } else {
                // All subsequent users are regular users by default
                this.role = 'USER';
                this.isFirstUser = false;
            }
        } else {
            // For existing users, prevent role changes
            if (this.isModified('role')) {
                const original = await this.constructor.findById(this._id);
                if (original && original.role !== this.role) {
                    const error = new Error('Role cannot be changed after user creation');
                    error.name = 'ValidationError';
                    return next(error);
                }
            }
        }
        next();
    } catch (error) {
        next(error);
    }
});
const User = model('User', userSchema);
export default User;