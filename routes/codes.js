import express from 'express';
import User from '../src/models/User.js';
import Quest from '../src/models/Quest.js';
import { requireAuthFlexible } from '../utils/jwt.js';

const router = express.Router();

// Generate a random 6-character code
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate quest admin code when quest is created
router.post('/generate-quest-code', requireAuthFlexible, async (req, res) => {
    try {
        const { questId } = req.body;
        const userId = req.user.userId || req.user._id;
        
        // Verify user is the creator of this quest
        const quest = await Quest.findById(questId);
        if (!quest || quest.creator.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied. Only quest creator can generate codes.' });
        }
        
        // Generate admin code for quest if it doesn't exist
        if (!quest.inviteCode) {
            let adminCode;
            let isUnique = false;
            
            // Ensure the code is unique
            while (!isUnique) {
                adminCode = 'ADM' + generateCode();
                const existingQuest = await Quest.findOne({ inviteCode: adminCode });
                if (!existingQuest) {
                    isUnique = true;
                }
            }
            
            quest.inviteCode = adminCode;
            quest.inviteCodeExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            await quest.save();
        }
        
        // Generate Telegram bot link
        const botUsername = process.env.BOT_USERNAME || 'taskquest_guardian_bot';
        const botLink = `https://t.me/${botUsername}?start=auth_${quest.inviteCode}`;
        
        res.json({
            success: true,
            questId: quest._id,
            questTitle: quest.title,
            adminCode: quest.inviteCode,
            botLink,
            message: 'Admin code generated successfully. Use this to register as admin in Telegram bot.'
        });
        
    } catch (error) {
        console.error('Error generating quest admin code:', error);
        res.status(500).json({ error: 'Failed to generate admin code' });
    }
});

// Generate individual user codes for quest members
router.post('/generate-user-codes', requireAuthFlexible, async (req, res) => {
    try {
        const { questId, userEmails } = req.body;
        const userId = req.user.userId || req.user._id;
        
        // Verify user is the creator of this quest
        const quest = await Quest.findById(questId);
        if (!quest || quest.creator.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied. Only quest creator can generate user codes.' });
        }
        
        const userCodes = [];
        
        for (const email of userEmails) {
            // Find or create user
            let user = await User.findOne({ email });
            
            if (!user) {
                // Create new user if doesn't exist
                user = new User({
                    username: email.split('@')[0], // Use email prefix as username
                    email: email,
                    role: 'USER'
                });
            }
            
            // Generate unique link code for this user
            let userCode;
            let isUnique = false;
            
            while (!isUnique) {
                userCode = 'USR' + generateCode();
                const existingUser = await User.findOne({ linkCode: userCode });
                if (!existingUser) {
                    isUnique = true;
                }
            }
            
            user.linkCode = userCode;
            user.linkCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            
            // Add user to quest members if not already there
            if (!user.questsIn.includes(questId)) {
                user.questsIn.push(questId);
            }
            
            await user.save();
            
            // Add user to quest members if not already there
            if (!quest.members.includes(user._id)) {
                quest.members.push(user._id);
            }
            
            const botUsername = process.env.BOT_USERNAME || 'taskquest_guardian_bot';
            const botLink = `https://t.me/${botUsername}?start=auth_${userCode}`;
            
            userCodes.push({
                email: user.email,
                username: user.username,
                userCode: userCode,
                botLink: botLink
            });
        }
        
        await quest.save();
        
        res.json({
            success: true,
            questId: quest._id,
            questTitle: quest.title,
            userCodes: userCodes,
            message: `Generated codes for ${userCodes.length} users`
        });
        
    } catch (error) {
        console.error('Error generating user codes:', error);
        res.status(500).json({ error: 'Failed to generate user codes' });
    }
});

// Get all codes for a quest (admin only)
router.get('/quest/:questId/codes', requireAuthFlexible, async (req, res) => {
    try {
        const { questId } = req.params;
        const userId = req.user.userId || req.user._id;
        
        // Verify user is the creator of this quest
        const quest = await Quest.findById(questId).populate('members', 'username email linkCode linkCodeExpires');
        if (!quest || quest.creator.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied. Only quest creator can view codes.' });
        }
        
        const botUsername = process.env.BOT_USERNAME || 'taskquest_guardian_bot';
        
        // Admin code info
        const adminInfo = {
            type: 'admin',
            code: quest.inviteCode,
            botLink: quest.inviteCode ? `https://t.me/${botUsername}?start=auth_${quest.inviteCode}` : null,
            expires: quest.inviteCodeExpires
        };
        
        // User codes info
        const userCodes = quest.members.map(user => ({
            type: 'user',
            userId: user._id,
            username: user.username,
            email: user.email,
            code: user.linkCode,
            botLink: user.linkCode ? `https://t.me/${botUsername}?start=auth_${user.linkCode}` : null,
            expires: user.linkCodeExpires
        }));
        
        res.json({
            success: true,
            questId: quest._id,
            questTitle: quest.title,
            adminCode: adminInfo,
            userCodes: userCodes
        });
        
    } catch (error) {
        console.error('Error fetching quest codes:', error);
        res.status(500).json({ error: 'Failed to fetch codes' });
    }
});

// Regenerate expired or lost codes
router.post('/regenerate-code', requireAuthFlexible, async (req, res) => {
    try {
        const { questId, type, userId: targetUserId } = req.body; // type: 'admin' or 'user'
        const userId = req.user.userId || req.user._id;
        
        // Verify user is the creator of this quest
        const quest = await Quest.findById(questId);
        if (!quest || quest.creator.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Access denied. Only quest creator can regenerate codes.' });
        }
        
        const botUsername = process.env.BOT_USERNAME || 'taskquest_guardian_bot';
        
        if (type === 'admin') {
            // Regenerate admin code
            let adminCode;
            let isUnique = false;
            
            while (!isUnique) {
                adminCode = 'ADM' + generateCode();
                const existingQuest = await Quest.findOne({ inviteCode: adminCode });
                if (!existingQuest) {
                    isUnique = true;
                }
            }
            
            quest.inviteCode = adminCode;
            quest.inviteCodeExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            await quest.save();
            
            res.json({
                success: true,
                type: 'admin',
                code: adminCode,
                botLink: `https://t.me/${botUsername}?start=auth_${adminCode}`,
                expires: quest.inviteCodeExpires
            });
            
        } else if (type === 'user' && targetUserId) {
            // Regenerate user code
            const user = await User.findById(targetUserId);
            if (!user || !quest.members.includes(user._id)) {
                return res.status(404).json({ error: 'User not found in quest' });
            }
            
            let userCode;
            let isUnique = false;
            
            while (!isUnique) {
                userCode = 'USR' + generateCode();
                const existingUser = await User.findOne({ linkCode: userCode });
                if (!existingUser) {
                    isUnique = true;
                }
            }
            
            user.linkCode = userCode;
            user.linkCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            await user.save();
            
            res.json({
                success: true,
                type: 'user',
                userId: user._id,
                username: user.username,
                email: user.email,
                code: userCode,
                botLink: `https://t.me/${botUsername}?start=auth_${userCode}`,
                expires: user.linkCodeExpires
            });
        } else {
            res.status(400).json({ error: 'Invalid regeneration request' });
        }
        
    } catch (error) {
        console.error('Error regenerating code:', error);
        res.status(500).json({ error: 'Failed to regenerate code' });
    }
});

// Unified admin code generation endpoint
router.post('/admin/generate', requireAuthFlexible, async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        
        // Find the user's quest (assuming admin creates one quest for now)
        const quest = await Quest.findOne({ creator: userId, isActive: true });
        if (!quest) {
            return res.status(404).json({ error: 'No active quest found. Create a quest first.' });
        }
        
        // Generate admin code for quest if it doesn't exist or regenerate
        let adminCode;
        let isUnique = false;
        
        // Ensure the code is unique
        while (!isUnique) {
            adminCode = 'ADM' + generateCode();
            const existingQuest = await Quest.findOne({ inviteCode: adminCode });
            if (!existingQuest || existingQuest._id.toString() === quest._id.toString()) {
                isUnique = true;
            }
        }
        
        quest.inviteCode = adminCode;
        quest.inviteCodeExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await quest.save();
        
        const botUsername = process.env.BOT_USERNAME || 'taskquest_guardian_bot';
        const botLink = `https://t.me/${botUsername}?start=auth_${adminCode}`;
        
        res.json({
            success: true,
            questId: quest._id,
            questTitle: quest.title,
            adminCode: adminCode,
            botLink,
            message: 'Admin code generated successfully.'
        });
        
    } catch (error) {
        console.error('Error generating admin code:', error);
        res.status(500).json({ error: 'Failed to generate admin code' });
    }
});

// Unified user code generation endpoint
router.post('/user/generate', requireAuthFlexible, async (req, res) => {
    try {
        const { userEmails } = req.body;
        const userId = req.user.userId || req.user._id;
        
        if (!userEmails || !Array.isArray(userEmails) || userEmails.length === 0) {
            return res.status(400).json({ error: 'Please provide user emails to generate codes for.' });
        }
        
        // Find the user's quest
        const quest = await Quest.findOne({ creator: userId, isActive: true });
        if (!quest) {
            return res.status(404).json({ error: 'No active quest found. Create a quest first.' });
        }
        
        const userCodes = [];
        
        for (const email of userEmails) {
            // Find or create user
            let user = await User.findOne({ email });
            
            if (!user) {
                // Create new user if doesn't exist
                user = new User({
                    username: email.split('@')[0], // Use email prefix as username
                    email: email,
                    role: 'USER'
                });
            }
            
            // Generate unique link code for this user
            let userCode;
            let isUnique = false;
            
            while (!isUnique) {
                userCode = 'USR' + generateCode();
                const existingUser = await User.findOne({ linkCode: userCode });
                if (!existingUser || existingUser._id.toString() === user._id.toString()) {
                    isUnique = true;
                }
            }
            
            user.linkCode = userCode;
            user.linkCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            
            // Add user to quest members if not already there
            if (!user.questsIn.includes(quest._id)) {
                user.questsIn.push(quest._id);
            }
            
            await user.save();
            
            // Add user to quest members if not already there
            if (!quest.members.includes(user._id)) {
                quest.members.push(user._id);
            }
            
            const botUsername = process.env.BOT_USERNAME || 'taskquest_guardian_bot';
            const botLink = `https://t.me/${botUsername}?start=auth_${userCode}`;
            
            userCodes.push({
                email: user.email,
                username: user.username,
                userCode: userCode,
                botLink: botLink
            });
        }
        
        await quest.save();
        
        res.json({
            success: true,
            questId: quest._id,
            questTitle: quest.title,
            userCodes: userCodes,
            message: `Generated codes for ${userCodes.length} users`
        });
        
    } catch (error) {
        console.error('Error generating user codes:', error);
        res.status(500).json({ error: 'Failed to generate user codes' });
    }
});

// Get all codes for the current user's quest
router.get('/', requireAuthFlexible, async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        
        // Find the user's quest
        const quest = await Quest.findOne({ creator: userId, isActive: true }).populate('members', 'username email linkCode linkCodeExpires');
        if (!quest) {
            return res.json({ success: true, codes: [] });
        }
        
        const codes = [];
        
        // Add admin code if exists
        if (quest.inviteCode) {
            codes.push({
                type: 'admin',
                code: quest.inviteCode,
                expiresAt: quest.inviteCodeExpires,
                userName: 'Quest Admin'
            });
        }
        
        // Add user codes
        quest.members.forEach(member => {
            if (member.linkCode && member.role !== 'ADMIN') {
                codes.push({
                    type: 'user',
                    code: member.linkCode,
                    expiresAt: member.linkCodeExpires,
                    userName: member.username || member.email
                });
            }
        });
        
        res.json({
            success: true,
            codes: codes
        });
        
    } catch (error) {
        console.error('Error fetching codes:', error);
        res.status(500).json({ error: 'Failed to fetch codes' });
    }
});

export default router;
