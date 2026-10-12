const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email',
            ],
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        bio: {
            type: String,
            default: '',
        },
        profilePic: {
            type: String,
            default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', // Default avatar
        },
        followers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        following: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        savedPosts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Post',
            },
        ],
        isDeactivated: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        note: {
            type: String,
            default: '',
        },
        // Privacy & Security
        isPrivate: {
            type: Boolean,
            default: false,
        },
        blockedUsers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        closeFriends: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        tagsPolicy: {
            type: String,
            enum: ['everyone', 'following', 'none'],
            default: 'everyone',
        },
        mentionsPolicy: {
            type: String,
            enum: ['everyone', 'following', 'none'],
            default: 'everyone',
        },
        // Activity & History
        searchHistory: [
            {
                query: String,
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                timestamp: { type: Date, default: Date.now },
            },
        ],
        bioHistory: [
            {
                text: String,
                timestamp: { type: Date, default: Date.now },
            },
        ],
        profilePicHistory: [
            {
                url: String,
                timestamp: { type: Date, default: Date.now },
            },
        ],
        reelsWatched: [
            {
                reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
                timestamp: { type: Date, default: Date.now },
            },
        ],
        timeSpentToday: {
            type: Number, // In minutes
            default: 0,
        },
        lastSyncDate: {
            type: String, // YYYY-MM-DD
            default: new Date().toISOString().split('T')[0],
        }
    },
    {
        timestamps: true,
    }
);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
// Encrypt password using bcrypt
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
