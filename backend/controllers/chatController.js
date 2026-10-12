const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get or create conversation with a user
// @route   POST /api/chat/conversation
const accessConversation = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).send('UserId not sent with request');
    }

    // Check if conversation exists
    let isChat = await Conversation.find({
        $and: [
            { participants: { $elemMatch: { $eq: req.user._id } } },
            { participants: { $elemMatch: { $eq: userId } } },
        ],
    })
        .populate('participants', '-password')
        .populate('lastMessage');

    isChat = await User.populate(isChat, {
        path: 'lastMessage.sender',
        select: 'username profilePic email',
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        // Create new conversation
        var chatData = {
            participants: [req.user._id, userId],
        };

        try {
            const createdChat = await Conversation.create(chatData);
            const FullChat = await Conversation.findOne({ _id: createdChat._id }).populate(
                'participants',
                '-password'
            );
            res.status(200).json(FullChat);
        } catch (error) {
            res.status(400);
            throw new Error(error.message);
        }
    }
};

// @desc    Fetch all conversations for user
// @route   GET /api/chat
const fetchChats = async (req, res) => {
    try {
        Conversation.find({
            participants: { $elemMatch: { $eq: req.user._id } },
            deletedBy: { $ne: req.user._id }
        })
            .populate('participants', '-password')
            .populate('lastMessage')
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: 'lastMessage.sender',
                    select: 'username profilePic email',
                });
                // Sort pinned first
                results.sort((a, b) => {
                    const aPinned = a.pinnedBy?.includes(req.user._id) ? 1 : 0;
                    const bPinned = b.pinnedBy?.includes(req.user._id) ? 1 : 0;
                    return bPinned - aPinned;
                });
                res.status(200).send(results);
            });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Send new message
// @route   POST /api/chat/message
const sendMessage = async (req, res) => {
    const { content, conversationId, type, sharedPostId, isOneTimeView } = req.body;
    // File is handled by multer if Type is image/audio/video

    let mediaUrl = '';
    if (req.file) {
        mediaUrl = req.file.path;
    }

    if (!conversationId) {
        return res.status(400).json({ message: 'Invalid data passed into request' });
    }

    var newMessage = {
        sender: req.user._id,
        content: content,
        conversationId: conversationId,
        type: type || 'text',
        mediaUrl: mediaUrl,
        sharedPostId: sharedPostId || null,
        isOneTimeView: isOneTimeView === 'true' || isOneTimeView === true, // handle multipart string or json boolean
    };

    try {
        var message = await Message.create(newMessage);

        // Populate everything needed for frontend
        message = await message.populate('sender', 'username profilePic');
        message = await message.populate('conversationId');
        message = await message.populate('sharedPostId'); // If sharing a post
        message = await User.populate(message, {
            path: 'conversationId.participants',
            select: 'username profilePic email',
        });

        await Conversation.findByIdAndUpdate(req.body.conversationId, {
            lastMessage: message,
            // Restore for everyone (if it was deleted)
            $pull: { deletedBy: { $in: message.conversationId.participants } }
        });

        // Real-time emit
        const io = req.io;
        if (io && message.conversationId && message.conversationId.participants) {
            message.conversationId.participants.forEach(async (user) => {
                if (user && user._id && user._id.toString() !== message.sender._id.toString()) {
                    io.to(user._id.toString()).emit("message_received", message);

                    // Create Notification
                    try {
                        const notification = await Notification.create({
                            recipient: user._id,
                            sender: req.user._id,
                            type: 'message',
                            relatedId: message._id,
                            content: message.content || 'Sent a media file',
                        });

                        // Emit notification event for Sidebar badge
                        if (io) {
                            io.to(user._id.toString()).emit("notification_received", notification);
                        }
                    } catch (notifError) {
                        console.error("Notification creation failed:", notifError);
                    }
                }
            });
        }

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Get all messages for a conversation
// @route   GET /api/chat/:conversationId
const allMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            conversationId: req.params.conversationId,
            deletedBy: { $ne: req.user._id }
        })
            .populate('sender', 'username profilePic email')
            .populate('sharedPostId');
        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Mark one-time message as viewed
// @route   PUT /api/chat/message/:id/view
const viewOneTimeMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (!message.isOneTimeView) return res.status(400).json({ message: 'Not a one-time view message' });

        if (!message.viewedBy.includes(req.user._id)) {
            message.viewedBy.push(req.user._id);
            await message.save();
        }

        res.json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete message (for me or everyone)
// @route   PUT /api/chat/message/:id/delete
const deleteMessage = async (req, res) => {
    try {
        const { type } = req.body; // 'me' or 'everyone'
        const message = await Message.findById(req.params.id);

        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (type === 'everyone') {
            // Only sender can delete for everyone
            if (message.sender.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: 'Only sender can delete for everyone' });
            }
            message.isDeletedForEveryone = true;
            message.content = 'This message was deleted';
            message.mediaUrl = null;
            message.type = 'text'; // Reset type to text to just show the deletion text
            await message.save();

            // Emit real-time update
            const io = req.io;
            const conversation = await Conversation.findById(message.conversationId);
            if (conversation && io) {
                conversation.participants.forEach(userId => {
                    io.to(userId.toString()).emit("message_updated", message);
                });
            }

        } else if (type === 'me') {
            if (!message.deletedBy) {
                message.deletedBy = [];
            }
            if (!message.deletedBy.includes(req.user._id)) {
                message.deletedBy.push(req.user._id);
            }
            await message.save();
            // Emit to self only to update UI
            const io = req.io;
        }

        res.json(message);
    } catch (error) {
        console.error("Delete Message Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mute/Unmute Conversation
// @route   PUT /api/chat/conversation/:id/mute
const muteConversation = async (req, res) => {
    try {
        const chat = await Conversation.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        if (chat.mutedBy.includes(req.user._id)) {
            chat.mutedBy.pull(req.user._id);
        } else {
            chat.mutedBy.push(req.user._id);
        }
        await chat.save();
        res.json(chat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Pin/Unpin Conversation
// @route   PUT /api/chat/conversation/:id/pin
const pinConversation = async (req, res) => {
    try {
        const chat = await Conversation.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        if (chat.pinnedBy.includes(req.user._id)) {
            chat.pinnedBy.pull(req.user._id);
        } else {
            chat.pinnedBy.push(req.user._id);
        }
        await chat.save();
        res.json(chat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Conversation (Hide for user)
// @route   PUT /api/chat/conversation/:id/delete
const deleteConversation = async (req, res) => {
    try {
        const chat = await Conversation.findById(req.params.id);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        if (!chat.deletedBy.includes(req.user._id)) {
            chat.deletedBy.push(req.user._id);
        }
        await chat.save();
        res.json({ message: "Conversation deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { accessConversation, fetchChats, sendMessage, allMessages, viewOneTimeMessage, deleteMessage, muteConversation, pinConversation, deleteConversation };
