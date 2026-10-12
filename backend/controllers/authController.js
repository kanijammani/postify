const User = require('../models/User.js');
const generateToken = (id) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id }, process.env.JWT_SECRET || 'postify_jwt_secret_key_12345', {
        expiresIn: '30d',
    });
};

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const userExists = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username: username.trim() }]
        });

        if (userExists) {
            return res.status(400).json({
                message: userExists.email === email.toLowerCase() ? 'User with this email already exists' : 'Username is already taken'
            });
        }

        const user = await User.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password,
        });

        if (user) {
            return res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                profilePic: user.profilePic,
                token: generateToken(user._id),
            });
        } else {
            return res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration error:', error.message);
        return res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (user && user.isDeleted) {
            return res.status(403).json({ message: 'Account has been deleted or scheduled for deletion' });
        }

        if (user && (await user.matchPassword(password))) {
            // Automatically reactivate account if it was deactivated
            if (user.isDeactivated) {
                user.isDeactivated = false;
                await user.save();
            }

            return res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                profilePic: user.profilePic,
                token: generateToken(user._id),
            });
        } else {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({ message: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            return res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                profilePic: user.profilePic,
                bio: user.bio,
                followers: user.followers,
                following: user.following,
                createdAt: user.createdAt,
                savedPosts: user.savedPosts
            });
        } else {
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('getMe error:', error.message);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, getMe };
