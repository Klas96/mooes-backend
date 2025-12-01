const { User, UserProfile, Image, Match } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const LocalStorageService = require('../services/localStorageService');

// @desc    Get my profile
// @route   GET /api/profiles/me
// @access  Private
const getMyProfile = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      where: { userId: req.user.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'emailVerified', 'createdAt']
        }
      ]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get user's images separately (Images belong to User, not UserProfile)
    const images = await Image.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });

    // Transform the profile to include images array for frontend compatibility
    const profileData = profile.toJSON();
    
    // Use the images from the Image model
    profileData.images = images.map(image => ({
      id: image.id,
      imageUrl: image.imageUrl,
      isPrimary: image.isPrimary,
      order: image.order,
      uploadedAt: image.createdAt
    }));

    res.json(profileData);
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update my profile
// @route   PUT /api/profiles/me
// @access  Private
const updateMyProfile = async (req, res) => {
  try {
    const {
      bio,
      age,
      birthDate,
      gender,
      genderPreference,
      relationshipType,
      location,
      locationMode,
      keyWords
    } = req.body;

    const profile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update profile fields
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (age !== undefined) updateData.age = age;
    if (birthDate !== undefined) {
      // Convert birthDate to age if provided
      const birthDateObj = new Date(birthDate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDateObj.getFullYear();
      const monthDiff = today.getMonth() - birthDateObj.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
        calculatedAge--;
      }
      updateData.age = calculatedAge;
      updateData.birthDate = birthDate;
    }
    if (gender !== undefined) updateData.gender = gender;
    if (genderPreference !== undefined) updateData.genderPreference = genderPreference;
    if (relationshipType !== undefined) updateData.relationshipType = relationshipType;
    if (location !== undefined) updateData.location = location;
    if (locationMode !== undefined) updateData.locationMode = locationMode;
    if (keyWords !== undefined) updateData.keyWords = keyWords;

    await profile.update(updateData);

    // Note: Keywords are handled via UserProfile.keyWords field (array), not a separate Keyword model

    // Fetch updated profile with associations
    const updatedProfile = await UserProfile.findOne({
      where: { userId: req.user.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'emailVerified', 'createdAt']
        }
      ]
    });

    // Get user's images separately (Images belong to User, not UserProfile)
    const images = await Image.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });

    // Transform the profile to include images
    const profileData = updatedProfile.toJSON();
    
    profileData.images = images.map(image => ({
      id: image.id,
      imageUrl: image.imageUrl,
      isPrimary: image.isPrimary,
      order: image.order,
      uploadedAt: image.createdAt
    }));

    res.json(profileData);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Upload profile picture (VPS Optimized)
// @route   POST /api/profiles/upload-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    console.log('📤 Starting profile picture upload (VPS mode)...');
    console.log(`  - User ID: ${req.user.id}`);
    console.log(`  - File present: ${!!req.file}`);
    
    if (!req.file) {
      console.log('❌ No image file provided');
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log(`  - Original filename: ${req.file.originalname}`);
    console.log(`  - Stored filename: ${req.file.filename}`);
    console.log(`  - File path: ${req.file.path}`);
    console.log(`  - File size: ${req.file.size} bytes`);
    console.log(`  - MIME type: ${req.file.mimetype}`);

    // Check if user already has 6 images
    const imageCount = await Image.count({
      where: { userId: req.user.id }
    });

    console.log(`  - Current image count: ${imageCount}`);

    if (imageCount >= 6) {
      console.log('❌ Maximum of 6 images allowed');
      return res.status(400).json({ error: 'Maximum of 6 images allowed' });
    }

    let imageUrl;
    let googleStorageDestination = null;
    let uploadMethod = 'unknown';
    let storageResult = null;

    // Check storage configuration
    const isLocalStorageConfigured = LocalStorageService.isConfigured();
    
    console.log('🔍 Checking storage configuration...');
    console.log(`  - Local storage configured: ${isLocalStorageConfigured}`);

    // Use Local Storage for VPS deployment
    if (!isLocalStorageConfigured) {
      console.log('❌ Local storage not configured');
      return res.status(500).json({ 
        error: 'Storage not configured. Please check UPLOADS_DIR environment variable.' 
      });
    }

    try {
      console.log('📤 Uploading to local storage...');
      
      const localStorage = new LocalStorageService();
      
      // Validate file
      const validation = localStorage.validateFile(req.file);
      if (!validation.isValid) {
        console.log('❌ File validation failed:', validation.errors);
        return res.status(400).json({ 
          error: 'File validation failed', 
          details: validation.errors 
        });
      }
      
      storageResult = await localStorage.uploadImage(req.file.path, 'profiles');
      imageUrl = storageResult.url;
      uploadMethod = 'local_storage';
      
      console.log('✅ Image uploaded to local storage successfully');
      console.log(`  - URL: ${imageUrl}`);
      console.log(`  - Thumbnail URL: ${storageResult.thumbnailUrl}`);
      console.log(`  - Compression: ${storageResult.compressionRatio.toFixed(1)}%`);
      
    } catch (storageError) {
      console.error('❌ Local storage upload failed:', storageError);
      console.error('  - Error details:', storageError.message);
      return res.status(500).json({ 
        error: 'Failed to upload image', 
        details: storageError.message 
      });
    }
    
    console.log('💾 Creating database record...');
    
    // Create new image record
    const image = await Image.create({
      userId: req.user.id,
      imageUrl: imageUrl,
      googleStorageDestination: googleStorageDestination,
      isPrimary: imageCount === 0, // First image is primary
      order: imageCount
    });

    console.log('✅ Database record created successfully');
    console.log(`  - Image ID: ${image.id}`);
    console.log(`  - Is primary: ${image.isPrimary}`);
    console.log(`  - Upload method: ${uploadMethod}`);

    // Update user's primary profile picture if this is the first image
    if (image.isPrimary) {
      const profile = await UserProfile.findOne({
        where: { userId: req.user.id }
      });
      
      if (profile) {
        await profile.update({ profilePicture: imageUrl });
        console.log('✅ Updated primary profile picture');
      }
    }

    // Get all user images to return (matching regular controller format)
    const allImages = await Image.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });

    const transformedImages = allImages.map(img => ({
      id: img.id,
      imageUrl: img.imageUrl,
      isPrimary: img.isPrimary,
      order: img.order,
      uploadedAt: img.createdAt
    }));

    console.log('✅ Upload completed successfully');
    console.log(`  - Upload method: ${uploadMethod}`);
    console.log(`  - Total images: ${transformedImages.length}`);

    // Return success response with all images (matching regular controller format)
    res.status(201).json({
      message: 'Profile picture uploaded successfully',
      images: transformedImages,
      uploadMethod: uploadMethod
    });

  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    console.error('  - Error details:', error.message);
    console.error('  - Stack trace:', error.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Delete image
// @route   DELETE /api/profiles/images/:imageId
// @access  Private
const deleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    // Find the image
    const image = await Image.findOne({
      where: {
        id: imageId,
        userId: req.user.id
      }
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    console.log(`🗑️ Deleting image: ${image.imageUrl}`);

    // Delete from local storage
    try {
      if (image.imageUrl.startsWith('/uploads/')) {
        const localStorage = new LocalStorageService();
        await localStorage.deleteImage(image.imageUrl);
        console.log('✅ Image deleted from local storage');
      } else {
        console.log('⚠️ Image URL does not match local storage pattern');
      }
    } catch (deleteError) {
      console.error('⚠️ Error deleting from storage:', deleteError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await image.destroy();

    // If this was the primary image, set another image as primary
    if (image.isPrimary) {
      const remainingImages = await Image.findAll({
        where: { userId: req.user.id },
        order: [['order', 'ASC']]
      });

      if (remainingImages.length > 0) {
        await remainingImages[0].update({ isPrimary: true });
        
        // Update profile picture
        const profile = await UserProfile.findOne({
          where: { userId: req.user.id }
        });
        
        if (profile) {
          await profile.update({ profilePicture: remainingImages[0].imageUrl });
        }
      } else {
        // No images left, clear profile picture
        const profile = await UserProfile.findOne({
          where: { userId: req.user.id }
        });
        
        if (profile) {
          await profile.update({ profilePicture: null });
        }
      }
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update image order
// @route   PUT /api/profiles/images/order
// @access  Private
const updateImageOrder = async (req, res) => {
  try {
    // Support both formats: imageIds array or imageOrders array of objects
    const { imageIds, imageOrders } = req.body;
    
    let imagesToUpdate = [];
    
    if (imageOrders && Array.isArray(imageOrders)) {
      // New format: [{ imageId: 1, order: 0 }, ...]
      imagesToUpdate = imageOrders;
    } else if (imageIds && Array.isArray(imageIds)) {
      // Old format: [1, 2, 3]
      imagesToUpdate = imageIds.map((id, index) => ({ imageId: id, order: index }));
    } else {
      return res.status(400).json({ error: 'Image IDs or image orders array is required' });
    }

    // Extract just the IDs for verification
    const idsToVerify = imagesToUpdate.map(item => 
      typeof item === 'object' ? item.imageId : item
    );

    // Verify all images belong to the user
    const userImages = await Image.findAll({
      where: { 
        id: idsToVerify,
        userId: req.user.id 
      }
    });

    if (userImages.length !== idsToVerify.length) {
      return res.status(400).json({ error: 'Some images not found or do not belong to user' });
    }

    // Update the order of each image and set primary status
    for (const item of imagesToUpdate) {
      const imageId = typeof item === 'object' ? item.imageId : item;
      const order = typeof item === 'object' ? item.order : imagesToUpdate.indexOf(item);
      const image = userImages.find(img => img.id.toString() === imageId.toString());
      
      if (image) {
        image.order = order;
        // Set the first image (order 0) as primary, others as non-primary
        image.isPrimary = (order === 0);
        await image.save();
      }
    }

    // Get updated images to return
    const updatedImages = await Image.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });

    const transformedImages = updatedImages.map(image => ({
      id: image.id,
      imageUrl: image.imageUrl,
      isPrimary: image.isPrimary,
      order: image.order,
      uploadedAt: image.createdAt
    }));

    res.json({
      message: 'Image order updated successfully',
      images: transformedImages
    });
  } catch (error) {
    console.error('Update image order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Helper function to calculate distance between two GPS coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

// @desc    Get potential matches
// @route   GET /api/profiles/potential-matches
// @access  Private
const getPotentialMatches = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    console.log(`\n=== GET POTENTIAL MATCHES ===`);
    console.log(`User ID: ${req.user.id}`);

    // Get user's profile and preferences
    const userProfile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log(`User profile ID: ${userProfile.id}`);
    console.log(`Gender: ${userProfile.gender}, Preference: ${userProfile.genderPreference}`);
    console.log(`Location Mode: ${userProfile.locationMode}`);

    // Build match criteria
    const whereClause = {
      userId: { [Op.ne]: req.user.id },
      isHidden: false
    };

    // Age range - only filter if user has age AND age preference is important
    // Removed strict age filtering to allow more matches
    // if (userProfile.age) {
    //   const ageRange = 5; // ±5 years
    //   whereClause.age = {
    //     [Op.between]: [userProfile.age - ageRange, userProfile.age + ageRange]
    //   };
    // }

    // Gender preference mapping: M=M, W=F, B=no filter
    // Only filter if user has a specific gender preference (not 'B' = Both)
    if (userProfile.genderPreference && userProfile.genderPreference !== 'B') {
      if (userProfile.genderPreference === 'W') {
        whereClause.gender = 'F'; // Women -> Female
      } else if (userProfile.genderPreference === 'M') {
        whereClause.gender = 'M'; // Men -> Male
      }
    }

    // Location - only filter if locationMode is 'local'
    // For 'global' mode, show all profiles regardless of location
    if (userProfile.location && userProfile.locationMode === 'local') {
      whereClause.location = {
        [Op.iLike]: `%${userProfile.location}%`
      };
    }

    // Get profiles that the user has already interacted with (liked or disliked)
    const existingMatches = await Match.findAll({
      where: {
        [Op.or]: [
          { user1Id: userProfile.id },
          { user2Id: userProfile.id }
        ]
      }
    });

    // Extract profile IDs that the CURRENT USER has already interacted with
    const interactedProfileIds = existingMatches
      .filter(match => {
        // Only exclude profiles where the CURRENT USER has explicitly made a decision
        if (match.user1Id === userProfile.id) {
          // Current user is user1 - exclude if they have liked, disliked, or matched
          return match.user1Liked === true || match.status === 'disliked' || match.status === 'matched';
        } else if (match.user2Id === userProfile.id) {
          // Current user is user2 - exclude if they have liked, disliked, or matched
          return match.user2Liked === true || match.status === 'disliked' || match.status === 'matched';
        }
        return false;
      })
      .map(match => {
        return match.user1Id === userProfile.id ? match.user2Id : match.user1Id;
      });

    // Filter out profiles that the user has already interacted with
    if (interactedProfileIds.length > 0) {
      whereClause.id = { [Op.notIn]: interactedProfileIds };
    }

    console.log(`Already interacted with ${interactedProfileIds.length} profiles`);
    console.log(`Where clause:`, JSON.stringify(whereClause, null, 2));

    // Get potential matches
    const matches = await UserProfile.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'emailVerified', 'createdAt', 'firstName', 'lastName']
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${matches.count} total matches before gender compatibility filter`);

    // Filter for mutual gender compatibility
    // Remove profiles that wouldn't want to see the current user based on their gender preference
    const mutuallyCompatibleMatches = matches.rows.filter(profile => {
      // If the other profile has genderPreference='B' (Both), they see everyone
      if (profile.genderPreference === 'B') {
        return true;
      }
      
      // Check if the other profile wants to see the current user's gender
      if (profile.genderPreference === 'M' && userProfile.gender === 'M') {
        return true; // They want men, user is male
      }
      if (profile.genderPreference === 'W' && userProfile.gender === 'F') {
        return true; // They want women, user is female
      }
      
      // No mutual compatibility
      return false;
    });

    console.log(`${mutuallyCompatibleMatches.length} mutually compatible matches after gender filter`);

    // Get user's keywords for matching
    const userKeywords = userProfile.keyWords || [];
    console.log(`User has ${userKeywords.length} keywords:`, userKeywords);

    // Get images for each match separately (Images belong to User, not UserProfile)
    const matchesWithImages = await Promise.all(
      mutuallyCompatibleMatches.map(async (profile) => {
        const images = await Image.findAll({
          where: { userId: profile.userId },
          attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt'],
          order: [['order', 'ASC'], ['createdAt', 'ASC']],
          limit: 1 // Only get primary image for list view
        });
        
        const profileData = profile.toJSON();
        profileData.images = images.map(img => ({
          id: img.id,
          imageUrl: img.imageUrl,
          isPrimary: img.isPrimary,
          order: img.order,
          uploadedAt: img.createdAt
        }));
        
        // Calculate distance if both users have GPS coordinates and user is in local mode
        let distanceScore = 0;
        if (userProfile.locationMode === 'local' && 
            userProfile.latitude && userProfile.longitude &&
            profile.latitude && profile.longitude) {
          const distance = calculateDistance(
            parseFloat(userProfile.latitude),
            parseFloat(userProfile.longitude),
            parseFloat(profile.latitude),
            parseFloat(profile.longitude)
          );
          profileData.distance = Math.round(distance * 10) / 10; // Round to 1 decimal place
          
          // Distance scoring: closer = higher score
          // Within 5km = 100 points, then decreasing
          if (distance <= 5) {
            distanceScore = 100;
          } else if (distance <= 10) {
            distanceScore = 80;
          } else if (distance <= 25) {
            distanceScore = 60;
          } else if (distance <= 50) {
            distanceScore = 40;
          } else if (distance <= 100) {
            distanceScore = 20;
          } else {
            distanceScore = 10;
          }
          
          console.log(`Distance to ${profile.user.firstName}: ${profileData.distance} km (score: ${distanceScore})`);
        } else {
          profileData.distance = null; // No distance available
        }
        
        // Calculate keyword matching score
        const profileKeywords = profile.keyWords || [];
        const matchingKeywords = userKeywords.filter(keyword => 
          profileKeywords.some(pk => pk.toLowerCase() === keyword.toLowerCase())
        );
        const keywordScore = matchingKeywords.length * 10; // 10 points per matching keyword
        
        profileData.matchingKeywords = matchingKeywords;
        profileData.matchingKeywordCount = matchingKeywords.length;
        
        // Calculate composite score
        // In local mode: 60% keywords + 40% distance
        // In global mode: 100% keywords
        let compositeScore = 0;
        if (userProfile.locationMode === 'local' && profileData.distance !== null) {
          compositeScore = (keywordScore * 0.6) + (distanceScore * 0.4);
        } else {
          compositeScore = keywordScore;
        }
        
        profileData.matchScore = Math.round(compositeScore);
        
        if (matchingKeywords.length > 0) {
          console.log(`${profile.user.firstName}: ${matchingKeywords.length} matching keywords (${matchingKeywords.join(', ')}) - Score: ${profileData.matchScore}`);
        }
        
        return profileData;
      })
    );

    // Sort by composite score (higher score = better match)
    let sortedMatches = matchesWithImages.sort((a, b) => {
      // Sort by match score (higher first)
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      
      // If scores are equal, prioritize profiles with distance in local mode
      if (userProfile.locationMode === 'local') {
        if (a.distance !== null && b.distance === null) return -1;
        if (a.distance === null && b.distance !== null) return 1;
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance; // Closer first
        }
      }
      
      // Keep original order
      return 0;
    });
    
    console.log(`Sorted ${sortedMatches.length} profiles by composite score (keywords + distance)`);
    console.log(`Top 3 profiles: ${sortedMatches.slice(0, 3).map(p => `${p.user.firstName} (score: ${p.matchScore})`).join(', ')}`);


    res.json({
      profiles: sortedMatches, // Frontend expects 'profiles' key
      matches: sortedMatches,  // Keep for backward compatibility
      totalCount: matches.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(matches.count / limit)
    });
  } catch (error) {
    console.error('Error getting potential matches:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get profile by ID
// @route   GET /api/profiles/:id
// @access  Private
const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await UserProfile.findOne({
      where: { userId: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'emailVerified', 'createdAt']
        },
        {
          model: Keyword,
          as: 'keywords'
        }
      ]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get images separately
    const images = await Image.findAll({
      where: { userId: profile.userId },
      attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt'],
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });

    const profileData = profile.toJSON();
    profileData.images = images.map(img => ({
      id: img.id,
      imageUrl: img.imageUrl,
      isPrimary: img.isPrimary,
      order: img.order,
      uploadedAt: img.createdAt
    }));

    res.json(profileData);
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get all profiles (Admin)
// @route   GET /api/profiles/
// @access  Private
const getAllProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const profiles = await UserProfile.findAndCountAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'emailVerified', 'createdAt']
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    // Get images for each profile separately
    const profilesWithImages = await Promise.all(
      profiles.rows.map(async (profile) => {
        const images = await Image.findAll({
          where: { userId: profile.userId },
          attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt'],
          order: [['order', 'ASC'], ['createdAt', 'ASC']],
          limit: 1
        });
        
        const profileData = profile.toJSON();
        profileData.images = images.map(img => ({
          id: img.id,
          imageUrl: img.imageUrl,
          isPrimary: img.isPrimary,
          order: img.order,
          uploadedAt: img.createdAt
        }));
        
        return profileData;
      })
    );

    res.json({
      profiles: profilesWithImages,
      totalCount: profiles.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(profiles.count / limit)
    });
  } catch (error) {
    console.error('Error getting all profiles:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Test storage services
// @route   GET /api/profiles/test-storage
// @access  Private
const testStorage = async (req, res) => {
  try {
    const results = {
      localStorage: {
        configured: LocalStorageService.isConfigured(),
        stats: null
      }
    };

    // Get local storage stats if configured
    if (results.localStorage.configured) {
      try {
        const localStorage = new LocalStorageService();
        results.localStorage.stats = await localStorage.getStorageStats();
      } catch (error) {
        results.localStorage.error = error.message;
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error testing storage:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Hide account
// @route   POST /api/profiles/hide
// @access  Private
const hideAccount = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await profile.update({ isHidden: true });

    res.json({ message: 'Account hidden successfully' });
  } catch (error) {
    console.error('Error hiding account:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Unhide account
// @route   POST /api/profiles/unhide
// @access  Private
const unhideAccount = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await profile.update({ isHidden: false });

    res.json({ message: 'Account unhidden successfully' });
  } catch (error) {
    console.error('Error unhiding account:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get account visibility
// @route   GET /api/profiles/visibility
// @access  Private
const getAccountVisibility = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({
      where: { userId: req.user.id },
      attributes: ['isHidden']
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ isHidden: profile.isHidden });
  } catch (error) {
    console.error('Error getting account visibility:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadProfilePicture,
  deleteImage,
  updateImageOrder,
  getPotentialMatches,
  getProfileById,
  getAllProfiles,
  testStorage,
  hideAccount,
  unhideAccount,
  getAccountVisibility
};

