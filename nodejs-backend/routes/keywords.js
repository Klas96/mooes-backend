const express = require('express');
const { protect } = require('../middleware/auth');
const { PopularKeywords } = require('../models');

const router = express.Router();

// @desc    Get popular keywords
// @route   GET /api/keywords/popular
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const keywords = await PopularKeywords.findAll({
      where: { isActive: true },
      order: [['usageCount', 'DESC'], ['keyword', 'ASC']],
      limit: 20
    });
    
    res.json(keywords);
  } catch (error) {
    console.error('Error getting popular keywords:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

