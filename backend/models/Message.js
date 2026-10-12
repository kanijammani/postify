const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['text', 'image', 'video', 'audio', 'post', 'reel'], // 'post' includes shared reels/posts
            default: 'text',
        },
        content: {
            type: String, // Text message or Caption
        },
        mediaUrl: {
            type: String, // Cloudinary URL for media
        },
        sharedPostId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post',
        },
        isOneTimeView: {
            type: Boolean,
            default: false,
        },
        viewedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        isDeletedForEveryone: {
            type: Boolean,
            default: false,
        },
        deletedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Message', messageSchema);
