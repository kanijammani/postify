const express = require('express');
const router = express.Router();
const { suggestCaption } = require('../controllers/aiController');
const multer = require('multer');

// Memory storage to process image without saving to disk/cloud permanently
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for suggestion
});

router.post('/suggest-caption', upload.single('file'), suggestCaption);

module.exports = router;
