const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const { accessConversation, fetchChats, sendMessage, allMessages, viewOneTimeMessage, deleteMessage, muteConversation, pinConversation, deleteConversation } = require('../controllers/chatController');

const router = express.Router();

router.route('/').get(protect, fetchChats);
router.route('/conversation').post(protect, accessConversation);
router.route('/message').post(protect, upload.single('file'), sendMessage);
router.route('/:conversationId').get(protect, allMessages);

router.route('/message/:id/view').put(protect, viewOneTimeMessage);
router.route('/message/:id/delete').put(protect, deleteMessage);

router.route('/conversation/:id/mute').put(protect, muteConversation);
router.route('/conversation/:id/pin').put(protect, pinConversation);
router.route('/conversation/:id/delete').put(protect, deleteConversation);

module.exports = router;
