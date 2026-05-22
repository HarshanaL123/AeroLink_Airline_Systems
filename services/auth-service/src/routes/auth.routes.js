const express = require('express');
const { register, login } = require('../controllers/auth.controller');

const router = express.Router();

// @route   POST /api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST /api/v1/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', login);

// @route   GET /api/v1/auth/me
// @desc    Get current logged in user (Protected Test Route)
// @access  Private (Passenger, Staff, Admin)
const { protect, authorize } = require('../middleware/auth.middleware');
router.get('/me', protect, (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

// @route   GET /api/v1/auth/admin-only
// @desc    Test Admin RBAC
// @access  Private (Admin Only)
router.get('/admin-only', protect, authorize('admin'), (req, res) => {
  res.status(200).json({ success: true, message: 'Welcome Admin!' });
});

module.exports = router;
