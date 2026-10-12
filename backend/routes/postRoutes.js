const express = require('express');
const {
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
} = require('../controllers/postController.js');
const { protect } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');

const router = express.Router();

// Protected routes (moved from public)
router.get('/explore', protect, getExplorePosts);
router.get('/user/:username', protect, getUserPosts);

// Protected routes
router.post('/', protect, upload.single('file'), createPost);
router.get('/', protect, getFeedPosts);
router.get('/saved', protect, getSavedPosts);
router.delete('/:id', protect, deletePost);
router.put('/:id/like', protect, likePost);
router.put('/:id/save', protect, savePost);
router.get('/history/deleted', protect, getDeletedPosts);
router.put('/:id/restore', protect, restorePost);
router.delete('/:id/permanent', protect, permanentlyDeletePost);
router.post('/:id/comment', protect, addComment);
router.delete('/:id/comment/:commentId', protect, deleteComment);

module.exports = router;
