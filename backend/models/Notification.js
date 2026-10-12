const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['message', 'like', 'comment', 'follow'],
        required: true,
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId, // Could be MessageID, PostID, or UserID
        required: true,
    },
    content: {
        type: String,
        default: '',
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Notification', notificationSchema);
