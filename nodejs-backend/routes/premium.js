const express = require('express');
const { protect } = require('../middleware/auth');
const { User } = require('../models');

const router = express.Router();

// @desc    Purchase premium subscription
// @route   POST /api/premium/purchase
// @access  Private
const purchasePremium = async (req, res) => {
  try {
    const { plan, days = 30 } = req.body;
    
    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    // Update user's premium status
    await User.update(
      {
        isPremium: true,
        premiumExpiry: expiryDate,
        premiumPlan: plan || 'monthly',
      },
      {
        where: { id: req.user.id }
      }
    );
    
    res.json({
      success: true,
      message: 'Premium subscription activated successfully',
      expiry_date: expiryDate.toISOString(),
      plan: plan || 'monthly',
    });
  } catch (error) {
    console.error('Purchase premium error:', error);
    res.status(500).json({ error: 'Failed to purchase premium subscription' });
  }
};

// @desc    Cancel premium subscription
// @route   POST /api/premium/cancel
// @access  Private
const cancelPremium = async (req, res) => {
  try {
    // Update user's premium status
    await User.update(
      {
        isPremium: false,
        premiumExpiry: null,
        premiumPlan: null,
      },
      {
        where: { id: req.user.id }
      }
    );
    
    res.json({
      success: true,
      message: 'Premium subscription cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel premium error:', error);
    res.status(500).json({ error: 'Failed to cancel premium subscription' });
  }
};

// @desc    Get premium status
// @route   GET /api/premium/status
// @access  Private
const getPremiumStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isPremium = user.isPremium && 
                     user.premiumExpiry && 
                     new Date() < new Date(user.premiumExpiry);
    
    res.json({
      isPremium,
      premiumExpiry: user.premiumExpiry,
      premiumPlan: user.premiumPlan,
    });
  } catch (error) {
    console.error('Get premium status error:', error);
    res.status(500).json({ error: 'Failed to get premium status' });
  }
};

// Routes
router.post('/purchase', protect, purchasePremium);
router.post('/cancel', protect, cancelPremium);
router.get('/status', protect, getPremiumStatus);

module.exports = router; 