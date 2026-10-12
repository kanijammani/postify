const Post = require('../models/Post.js');
const User = require('../models/User.js');
const Notification = require('../models/Notification.js');

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
    try {
        const { caption } = req.body;
        // Assuming file upload is handled by middleware and url is attached to req.file
        let imageUrl = '';
        let videoUrl = '';

        if (req.file) {
            // Simple check for image vs video based on mimetype or similar
            if (req.file.mimetype.startsWith('video')) {
                videoUrl = req.file.path; // Cloudinary URL
            } else {
                imageUrl = req.file.path; // Cloudinary URL
            }
        }

        const newPost = new Post({
            userId: req.user._id,
            imageUrl,
            videoUrl,
            caption,
            likes: [],
            comments: [],
        });

        const savedPost = await newPost.save();
        // Populate user details for the response
        await savedPost.populate('userId', 'username profilePic');

        res.status(201).json(savedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all posts (Feed)
// @route   GET /api/posts
// @access  Private
const getFeedPosts = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        // Create safe lists with fallbacks
        const followingIds = currentUser.following || [];
        const blockedUsers = currentUser.blockedUsers || [];

        // Find users who have blocked current user
        let whoBlockedMeIds = [];
        try {
            const whoBlockedMe = await User.find({ blockedUsers: req.user._id }).select('_id');
            whoBlockedMeIds = whoBlockedMe.map(u => u._id);
        } catch (err) {
            console.error("Error fetching who blocked me:", err);
        }

        // Get posts from following + own posts, excluding blocked users (mutual)
        const posts = await Post.find({
            userId: {
                $in: [...followingIds, req.user._id],
                $nin: [...blockedUsers, ...whoBlockedMeIds]
            },
            isDeleted: false
        })
            .sort({ createdAt: -1 })
            .populate('userId', 'username profilePic')
            .populate('comments.userId', 'username profilePic');

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get explore posts (Public)
// @route   GET /api/posts/explore
// @access  Public
const getExplorePosts = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        const blockedUsers = currentUser?.blockedUsers || [];

        // Find users who have blocked current user
        const whoBlockedMe = await User.find({ blockedUsers: req.user._id }).select('_id');
        const whoBlockedMeIds = whoBlockedMe.map(u => u._id);

        const posts = await Post.find({
            isDeleted: false,
            userId: { $nin: [...blockedUsers, ...whoBlockedMeIds] }
        })
            .sort({ createdAt: -1 })
            .populate('userId', 'username profilePic');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user posts
// @route   GET /api/posts/:username
const getUserPosts = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const posts = await Post.find({ userId: user._id, isDeleted: false })
            .sort({ createdAt: -1 })
            .populate('userId', 'username profilePic');

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// @desc    Like / Unlike post
// @route   PUT /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.likes.includes(req.user._id)) {
            post.likes = post.likes.filter((id) => id.toString() !== req.user._id.toString());
        } else {
            post.likes.push(req.user._id);

            // Create Notification
            if (post.userId.toString() !== req.user._id.toString()) {
                const notification = await Notification.create({
                    recipient: post.userId,
                    sender: req.user._id,
                    type: 'like',
                    relatedId: post._id,
                    content: 'liked your post',
                });

                // Real-time emit
                const io = req.io;
                if (io) {
                    io.to(post.userId.toString()).emit("notification_received", notification);
                }
            }
        }

        await post.save();
        res.json(post.likes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add comment
// @route   POST /api/posts/:id/comment
// @access  Private
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = {
            userId: req.user._id,
            text,
            createdAt: new Date(),
        };

        post.comments.push(comment);
        await post.save();

        // Create Notification
        if (post.userId.toString() !== req.user._id.toString()) {
            const notification = await Notification.create({
                recipient: post.userId,
                sender: req.user._id,
                type: 'comment',
                relatedId: post._id,
                content: `commented: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`,
            });

            // Real-time emit
            const io = req.io;
            if (io) {
                io.to(post.userId.toString()).emit("notification_received", notification);
            }
        }

        // We might want to populate the new comment user to return it
        const updatedPost = await Post.findById(req.params.id).populate('comments.userId', 'username profilePic');

        // Return the last comment (the new one)
        res.status(201).json(updatedPost.comments[updatedPost.comments.length - 1]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete comment
// @route   DELETE /api/posts/:id/comment/:commentId
// @access  Private
const deleteComment = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.find(c => c._id.toString() === req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        // Allow delete if: User is comment author OR User is post owner
        if (
            comment.userId.toString() !== req.user._id.toString() &&
            post.userId.toString() !== req.user._id.toString()
        ) {
            return res.status(401).json({ message: 'User not authorized to delete this comment' });
        }

        post.comments = post.comments.filter(c => c._id.toString() !== req.params.commentId);
        await post.save();

        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        post.isDeleted = true;
        post.deletedAt = new Date();
        await post.save();

        res.json({ message: 'Post moved to recently deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save / Unsave post
// @route   PUT /api/posts/:id/save
// @access  Private
const savePost = async (req, res) => {
    try {
        const postId = req.params.id;

        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'User not authorized based on token' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (user.savedPosts.includes(postId)) {
            user.savedPosts.pull(postId);
            await user.save();
            res.json({ message: 'Post unsaved', savedPosts: user.savedPosts });
        } else {
            user.savedPosts.push(postId);
            await user.save();
            res.json({ message: 'Post saved', savedPosts: user.savedPosts });
        }
    } catch (error) {
        console.error("Save Post Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get saved posts
// @route   GET /api/posts/saved
// @access  Private
const getSavedPosts = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'savedPosts',
            populate: {
                path: 'userId',
                select: 'username profilePic'
            }
        });

        const blockedUsers = user.blockedUsers.map(id => id.toString());
        res.json(user.savedPosts.filter(post => !post.isDeleted && !blockedUsers.includes(post.userId._id.toString())));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get deleted posts (History)
// @route   GET /api/posts/history/deleted
// @access  Private
const getDeletedPosts = async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.user._id, isDeleted: true })
            .sort({ deletedAt: -1 })
            .populate('userId', 'username profilePic');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Restore deleted post
// @route   PUT /api/posts/:id/restore
// @access  Private
const restorePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        post.isDeleted = false;
        post.deletedAt = null;
        await post.save();

        res.json({ message: 'Post restored', post });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Permanently delete post
// @route   DELETE /api/posts/:id/permanent
// @access  Private
const permanentlyDeletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await post.deleteOne();
        res.json({ message: 'Post permanently deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPost,
    getFeedPosts,
    getExplorePosts,
    getUserPosts,
    likePost,
    addComment,
    deletePost,
    savePost,
    getSavedPosts,
    getDeletedPosts,
    restorePost,
    permanentlyDeletePost,
    deleteComment
};
