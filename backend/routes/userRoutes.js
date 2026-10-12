const express = require('express');
const { getUserProfile, followUser, searchUsers, deactivateAccount, deleteAccount, updateProfile, updateSettings, blockUser, logReelWatch, getActivityLogs, getSearchHistory, deleteSearchHistory, addToSearchHistory } = require('../controllers/userController.js');
const { protect } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');

const router = express.Router();

router.get('/search', protect, searchUsers); // ?q=username
router.get('/search/history', protect, getSearchHistory);
router.post('/search/history', protect, addToSearchHistory);
router.delete('/search/history/:id', protect, deleteSearchHistory); // id can be 'all' or specific _id
router.put('/profile', protect, upload.single('profilePic'), updateProfile);
router.put('/settings', protect, updateSettings);
router.get('/activity/logs', protect, getActivityLogs);
router.post('/reels/watch/:id', protect, logReelWatch);
router.put('/block/:id', protect, blockUser);
router.get('/:username', protect, getUserProfile);
router.put('/:id/follow', protect, followUser);
router.put('/account/deactivate', protect, deactivateAccount);
router.delete('/account/delete', protect, deleteAccount);

module.exports = router;
