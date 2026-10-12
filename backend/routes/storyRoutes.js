const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const { createStory, getUserStories, getFeedStories, deleteStory, getDeletedStories, permanentlyDeleteStory, restoreStory } = require('../controllers/storyController');

const router = express.Router();

router.get('/', protect, getFeedStories);
router.post('/', protect, upload.single('file'), createStory);
router.get('/history/deleted', protect, getDeletedStories);
router.get('/user/:userId', protect, getUserStories);
router.delete('/:id', protect, deleteStory);
router.delete('/:id/permanent', protect, permanentlyDeleteStory);
router.put('/:id/restore', protect, restoreStory);

module.exports = router;
