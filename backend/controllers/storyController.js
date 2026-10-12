const Story = require('../models/Story');
const User = require('../models/User');

// Create a new story
exports.createStory = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload a story file" });
        }
        const { type } = req.body;
        const newStory = new Story({
            user: req.user._id,
            imageUrl: req.file.path,
            type: type || (req.file.mimetype.startsWith('video') ? 'video' : 'image'),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        });
        await newStory.save();
        res.status(201).json(newStory);
    } catch (error) {
        console.error("Error creating story:", error);
        res.status(500).json({ message: "Failed to create story" });
    }
};

// Get stories for a specific user
exports.getUserStories = async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const requesterId = req.user._id;

        const targetUser = await User.findById(targetUserId);
        const requester = await User.findById(requesterId);

        if (!targetUser || !requester) return res.status(404).json({ message: "User not found" });

        const isBlockedByTarget = targetUser.blockedUsers.some(id => id.toString() === requesterId.toString());
        const hasBlockedTarget = requester.blockedUsers.some(id => id.toString() === targetUserId.toString());

        if (isBlockedByTarget || hasBlockedTarget) {
            return res.status(403).json({ message: "Blocked" });
        }

        const stories = await Story.find({
            user: targetUserId,
            isDeleted: false
        })
            .populate('user', 'username profilePic')
            .sort({ createdAt: 1 });
        res.status(200).json(stories);
    } catch (error) {
        console.error("Error fetching stories:", error);
        res.status(500).json({ message: "Failed to fetch stories" });
    }
};

// Get feed stories (followed users + self)
exports.getFeedStories = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const following = user.following;
        const blockedUsers = user.blockedUsers;

        // Find users who have blocked current user (mutual)
        const whoBlockedMe = await User.find({ blockedUsers: req.user._id }).select('_id');
        const whoBlockedMeIds = whoBlockedMe.map(u => u._id);

        const stories = await Story.find({
            user: {
                $in: [...following, req.user._id],
                $nin: [...blockedUsers, ...whoBlockedMeIds]
            },
            isDeleted: false
        })
            .populate('user', 'username profilePic')
            .sort({ createdAt: 1 }); // Changed to ascending for easier grouping and viewing

        // Group stories by user
        const groupedStories = stories.reduce((acc, story) => {
            const userId = story.user._id.toString();
            if (!acc[userId]) {
                acc[userId] = {
                    user: story.user,
                    stories: []
                };
            }
            acc[userId].stories.push(story);
            return acc;
        }, {});

        // Optional: Sort groups by most recent story's date if needed, 
        // but for now returning them grouped.
        const result = Object.values(groupedStories);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching feed stories:", error);
        res.status(500).json({ message: "Failed to fetch feed stories" });
    }
};
// Delete a story (Soft Delete for History)
exports.deleteStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });

        if (story.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        story.isDeleted = true;
        story.deletedAt = new Date();
        // Keep in history for 30 days instead of expiring in 24h
        story.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await story.save();
        res.json({ message: "Story moved to recently deleted" });
    } catch (error) {
        console.error("Error deleting story:", error);
        res.status(500).json({ message: "Failed to delete story" });
    }
};

// Get deleted stories history
exports.getDeletedStories = async (req, res) => {
    try {
        const stories = await Story.find({
            user: req.user._id,
            isDeleted: true
        }).sort({ deletedAt: -1 });
        res.json(stories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Permanent delete
exports.permanentlyDeleteStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });
        if (story.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: "Unauthorized" });

        await story.deleteOne();
        res.json({ message: "Story permanently deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Restore story
exports.restoreStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });
        if (story.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: "Unauthorized" });

        story.isDeleted = false;
        story.deletedAt = null;
        // Reset expiration to 24h from original creation? 
        // Or just let it stay for another 24h from now.
        story.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await story.save();
        res.json({ message: "Story restored", story });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
