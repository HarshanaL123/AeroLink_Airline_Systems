const express = require('express');
const { getMyData, deleteMyAccount } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// @route   GET /api/v1/users/me/data
// @desc    Get all personal data for the logged-in user (GDPR Right to Access)
// @access  Private
router.get('/me/data', protect, getMyData);

// @route   DELETE /api/v1/users/me
// @desc    Delete the logged-in user's account completely (GDPR Right to be Forgotten)
// @access  Private
router.delete('/me', protect, deleteMyAccount);

module.exports = router;
