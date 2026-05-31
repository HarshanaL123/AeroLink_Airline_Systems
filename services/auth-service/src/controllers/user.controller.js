const User = require('../models/User');

/**
 * @desc    Get all personal data for the logged-in user (GDPR Right to Access)
 * @route   GET /api/v1/users/me/data
 * @access  Private
 */
const getMyData = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // GDPR Requirement: Strip sensitive internal data (like password hashes) before exporting
    delete user.passwordHash;

    res.status(200).json({
      success: true,
      message: 'Personal data exported successfully in accordance with GDPR Right to Access.',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete the logged-in user's account completely (GDPR Right to be Forgotten)
 * @route   DELETE /api/v1/users/me
 * @access  Private
 */
const deleteMyAccount = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Optional: In a full distributed transaction, we would fire an SNS event here
    // to tell the Booking Service to anonymize their past flight bookings.
    // For the scope of this Auth Service, we will permanently erase their Auth record.

    await User.delete(userId);

    res.status(200).json({
      success: true,
      message: 'Account permanently deleted in accordance with GDPR Right to be Forgotten.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyData,
  deleteMyAccount
};
