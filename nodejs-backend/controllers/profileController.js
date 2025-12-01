const { UserProfile, User, Image } = require('../models');
const { validationResult } = require('express-validator');
const GoogleStorageService = require('../services/googleStorageService');

// @desc    Get my profile
// @route   GET /api/profiles/me
// @access  Private
const getMyProfile = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ 
      where: { userId: req.user.id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get user's images
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

    console.log('Returning relationshipType:', profile.relationshipType, 'as', profile.get('relationshipType'));

    res.json(profileData);
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update my profile
// @route   PUT /api/profiles/me
// @access  Private
const updateMyProfile = async (req, res) => {
  try {
    console.log('=== DEBUG: updateMyProfile START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID:', req.user.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      bio,
      birthDate,
      gender,
      genderPreference,
      relationshipType,
      location,
      keyWords,
      locationMode,
      latitude,
      longitude
    } = req.body;

    // Debug logging
    console.log('=== DEBUG: updateMyProfile ===');
    console.log('Bio:', bio);
    console.log('Gender:', gender);
    console.log('GenderPreference:', genderPreference);
    console.log('RelationshipType:', relationshipType);
    console.log('KeyWords:', keyWords);
    console.log('Location:', location);
    console.log('Latitude:', latitude);
    console.log('Longitude:', longitude);

    const profile = await UserProfile.findOne({ 
      where: { userId: req.user.id }
    });

    if (!profile) {
      console.log('Profile not found for user ID:', req.user.id);
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('Found profile:', profile.id);

    // Update fields with proper validation
    if (bio !== undefined) profile.bio = bio;
    if (birthDate !== undefined && birthDate !== '' && birthDate !== 'Invalid date') {
      profile.birthDate = birthDate;
    } else if (birthDate === '' || birthDate === 'Invalid date') {
      profile.birthDate = null;
    }
    if (gender !== undefined) {
      if (gender === '') {
        profile.gender = null;
      } else {
        profile.gender = gender;
      }
    }
    if (genderPreference !== undefined) profile.genderPreference = genderPreference;
    if (location !== undefined) profile.location = location;
    if (keyWords !== undefined) profile.keyWords = keyWords;
    if (locationMode !== undefined) profile.locationMode = locationMode;
    if ('latitude' in req.body) {
      profile.latitude = latitude === null ? null : parseFloat(latitude);
    }
    if ('longitude' in req.body) {
      profile.longitude = longitude === null ? null : parseFloat(longitude);
    }

    console.log('About to save profile with relationshipType:', profile.relationshipType);
    console.log('Profile data before save:', JSON.stringify(profile.toJSON(), null, 2));
    
    try {
      await profile.save();
      console.log('Profile saved successfully. Final relationshipType:', profile.relationshipType);
      
      // Get updated profile with user data
      const updatedProfile = await UserProfile.findOne({ 
        where: { userId: req.user.id },
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email']
        }]
      });

      // Get user's images
      const images = await Image.findAll({
        where: { userId: req.user.id },
        attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
        order: [['order', 'ASC'], ['createdAt', 'ASC']]
      });

      // Transform the profile to include images array for frontend compatibility
      const profileData = updatedProfile.toJSON();
      
      // Use the images from the Image model
      profileData.images = images.map(image => ({
        id: image.id,
        imageUrl: image.imageUrl,
        isPrimary: image.isPrimary,
        order: image.order,
        uploadedAt: image.createdAt
      }));

      console.log('=== DEBUG: updateMyProfile SUCCESS ===');
      res.json(profileData);
    } catch (saveError) {
      console.error('Error saving profile:', saveError);
      console.error('Save error details:', saveError.message);
      console.error('Save error stack:', saveError.stack);
      throw saveError;
    }
  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Error stack:', error.stack);
    
    // Send more specific error messages
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Validation error: ' + error.message });
    }
    if (error.name === 'SequelizeDatabaseError') {
      console.error('Database error details:', error.original);
      return res.status(500).json({ error: 'Database error: ' + error.message });
    }
    if (error.name === 'SequelizeConnectionError') {
      console.error('Database connection error:', error.message);
      return res.status(503).json({ error: 'Database temporarily unavailable. Please try again.' });
    }
    if (error.name === 'SequelizeTimeoutError') {
      console.error('Database timeout error:', error.message);
      return res.status(504).json({ error: 'Database request timed out. Please try again.' });
    }
    
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

// @desc    Calculate keyword similarity between two keyword arrays
// @param   {Array} userKeywords - Current user's keywords
// @param   {Array} matchKeywords - Potential match's keywords
// @returns {Object} - Similarity score and shared keywords
const calculateKeywordSimilarity = (userKeywords, matchKeywords) => {
  if (!userKeywords || !matchKeywords || userKeywords.length === 0 || matchKeywords.length === 0) {
    return { score: 0, sharedKeywords: [] };
  }

  const userSet = new Set(userKeywords.map(k => k.toLowerCase().trim()));
  const matchSet = new Set(matchKeywords.map(k => k.toLowerCase().trim()));
  
  const intersection = new Set([...userSet].filter(x => matchSet.has(x)));
  const union = new Set([...userSet, ...matchSet]);
  
  const score = union.size > 0 ? intersection.size / union.size : 0;
  const sharedKeywords = Array.from(intersection);
  
  return { score, sharedKeywords };
};

// @desc    Get potential matches with enhanced keyword scoring
// @route   GET /api/profiles/potential-matches
// @access  Private
const getPotentialMatches = async (req, res) => {
  try {
    const currentProfile = await UserProfile.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found. Please complete your profile first.' });
    }

    console.log(`=== GET POTENTIAL MATCHES DEBUG ===`);
    console.log(`Getting potential matches for user: ${req.user.email} (User ID: ${req.user.id})`);
    console.log(`Current profile ID: ${currentProfile.id}`);
    console.log(`Current profile gender: ${currentProfile.gender}`);
    console.log(`Current profile gender preference: ${currentProfile.genderPreference}`);
    console.log(`Current profile keywords: ${JSON.stringify(currentProfile.keyWords)}`);

    const { genderPreference } = req.query; // Get genderPreference from query parameters
    console.log(`Filtering by genderPreference (from query): ${genderPreference}`);

    // Get all profiles except current user's and hidden profiles
    const { Op } = require('sequelize');
    let baseFilter = { 
      userId: { [Op.ne]: req.user.id },
      isHidden: false // Exclude hidden profiles
    };

    // Apply gender preference filter if provided
    if (genderPreference) {
      // Assuming genderPreference can be 'M', 'F', or 'B' (Both)
      // And profile.gender is 'M' or 'F'
      if (genderPreference === 'M') {
        baseFilter.gender = 'M';
      } else if (genderPreference === 'F') {
        baseFilter.gender = 'F';
      } else if (genderPreference === 'B') {
        // If preference is 'Both', no gender filter is applied here
        // This case is implicitly handled by not adding a gender filter
      }
    }

    // Log initial profiles count
    const initialProfilesCount = await UserProfile.count({ where: baseFilter });
    console.log(`Initial profiles count (excluding current user, with gender filter): ${initialProfilesCount}`);

    // Get profiles that the user has already interacted with (liked or disliked)
    const existingMatches = await Match.findAll({
      where: {
        [Op.or]: [
          { user1Id: currentProfile.id },
          { user2Id: currentProfile.id }
        ]
      },
      raw: true // Get raw data for easier logging
    });

    console.log(`Found ${existingMatches.length} existing match records:`);
    existingMatches.forEach(match => {
      console.log(`  - Match ID: ${match.id}, User1: ${match.user1Id}, User2: ${match.user2Id}, Status: ${match.status}, User1Liked: ${match.user1Liked}, User2Liked: ${match.user2Liked}`);
    });

    // Extract profile IDs that the CURRENT USER has already interacted with
    // Filter out profiles that the current user has actively liked, disliked, or matched with
    const interactedProfileIds = existingMatches
      .filter(match => {
        // Only exclude profiles where the CURRENT USER has explicitly made a decision
        if (match.user1Id === currentProfile.id) {
          // Current user is user1 - exclude if they have liked, disliked, or matched
          return match.user1Liked === true || match.status === 'disliked' || match.status === 'matched';
        } else if (match.user2Id === currentProfile.id) {
          // Current user is user2 - exclude if they have liked, disliked, or matched
          return match.user2Liked === true || match.status === 'disliked' || match.status === 'matched';
        }
        return false;
      })
      .map(match => {
        return match.user1Id === currentProfile.id ? match.user2Id : match.user1Id;
      });

    console.log(`Profiles already interacted with: ${interactedProfileIds.length}`);
    console.log(`Interacted profile IDs: [${interactedProfileIds.join(', ')}]`);

    // Filter out profiles that the user has already interacted with
    const finalFilter = {
      ...baseFilter,
      id: { [Op.notIn]: interactedProfileIds }
    };

    // Get profiles that haven't been interacted with
    let profiles = await UserProfile.findAll({
      where: finalFilter,
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }],
      limit: 100 // fetch more to allow for local filtering
    });

    // Location-based filtering for local mode
    let localFilterApplied = false;
    if (
      currentProfile.locationMode === 'local' &&
      currentProfile.latitude !== null &&
      currentProfile.longitude !== null
    ) {
      localFilterApplied = true;
      const R = 6371; // Earth radius in km
      const toRad = deg => (deg * Math.PI) / 180;
      const maxDistanceKm = 50; // 50km radius
      const userLat = parseFloat(currentProfile.latitude);
      const userLon = parseFloat(currentProfile.longitude);
      const profilesBeforeLocalFilter = profiles.length;
      profiles = profiles.filter(profile => {
        if (
          profile.latitude === null ||
          profile.longitude === null
        ) {
          return false;
        }
        const lat2 = parseFloat(profile.latitude);
        const lon2 = parseFloat(profile.longitude);
        const dLat = toRad(lat2 - userLat);
        const dLon = toRad(lon2 - userLon);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(userLat)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance <= maxDistanceKm;
      });
      
      console.log(`Local filtering: ${profilesBeforeLocalFilter} profiles before, ${profiles.length} profiles after filtering`);
    }

    console.log(`Profiles found after filtering: ${profiles.length}`);
    console.log(`Profile IDs returned: [${profiles.map(p => p.id).join(', ')}]`);

    // Transform the data and add keyword scoring
    const transformedProfiles = await Promise.all(profiles.map(async (profile) => {
      const profileData = profile.toJSON();
      
      // Get user's images
      const images = await Image.findAll({
        where: { userId: profileData.userId },
        attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
        order: [['order', 'ASC'], ['createdAt', 'ASC']]
      });
      
      // Transform images to match frontend expectations
      const transformedImages = images.map(image => ({
        id: image.id,
        imageUrl: image.imageUrl,
        isPrimary: image.isPrimary,
        order: image.order,
        uploadedAt: image.createdAt
      }));

      // Calculate keyword similarity
      const userKeywords = currentProfile.keyWords || [];
      const matchKeywords = profileData.keyWords || [];
      const keywordSimilarity = calculateKeywordSimilarity(userKeywords, matchKeywords);

      // Calculate relationship type overlap
      const currentTypes = Array.isArray(currentProfile.relationshipType) ? currentProfile.relationshipType : [currentProfile.relationshipType];
      const matchTypes = Array.isArray(profileData.relationshipType) ? profileData.relationshipType : [profileData.relationshipType];
      const relationshipOverlap = currentTypes.filter(type => matchTypes.includes(type)).length / Math.max(currentTypes.length, matchTypes.length);

      return {
        id: profileData.id,
        bio: profileData.bio,
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        genderPreference: profileData.genderPreference,
        relationshipType: profileData.relationshipType,
        location: profileData.location,
        keyWords: profileData.keyWords,
        locationMode: profileData.locationMode,
        profilePicture: transformedImages.length > 0 ? transformedImages[0].imageUrl : null,
        images: transformedImages,
        user: {
          id: profileData.user.id,
          firstName: profileData.user.firstName,
          lastName: profileData.user.lastName,
          email: profileData.user.email,
          username: `${profileData.user.firstName} ${profileData.user.lastName}`.trim()
        },
        createdAt: profileData.createdAt,
        updatedAt: profileData.updatedAt,
        // Enhanced matching data
        keywordScore: keywordSimilarity.score,
        sharedKeywords: keywordSimilarity.sharedKeywords,
        relationshipOverlap: relationshipOverlap,
        totalScore: (keywordSimilarity.score * 0.4) + (relationshipOverlap * 0.6)
      };
    }));

    // Sort by total score (keyword similarity + relationship overlap)
    transformedProfiles.sort((a, b) => b.totalScore - a.totalScore);

    console.log(`=== END DEBUG ===`);

    // Check if local filtering resulted in no matches
    if (localFilterApplied && transformedProfiles.length === 0) {
      return res.json({
        profiles: [],
        suggestion: {
          type: 'enable_global_mode',
          message: 'No matches found in your area. Try enabling global mode to see profiles worldwide!',
          action: 'update_location_mode',
          newMode: 'global'
        }
      });
    }

    // Return response with consistent format
    const response = {
      profiles: transformedProfiles
    };

    // Add suggestion if local filtering resulted in no matches
    if (localFilterApplied && transformedProfiles.length === 0) {
      response.suggestion = {
        type: 'enable_global_mode',
        message: 'No matches found in your area. Try enabling global mode to see profiles worldwide!',
        action: 'update_location_mode',
        newMode: 'global'
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Get potential matches error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Upload profile picture
// @route   POST /api/profiles/upload-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    console.log('📤 Starting profile picture upload...');
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

    // Check if Google Cloud Storage is configured
    console.log('🔍 Checking Google Cloud Storage configuration...');
    const isGCSConfigured = GoogleStorageService.isConfigured();
    console.log(`  - GCS configured: ${isGCSConfigured}`);

    if (isGCSConfigured) {
      try {
        console.log('📤 Attempting Google Cloud Storage upload...');
        
        // Upload to Google Cloud Storage
        const googleStorage = new GoogleStorageService();
        const storageResult = await googleStorage.uploadImage(req.file.path);
        
        imageUrl = storageResult.url;
        googleStorageDestination = storageResult.destination;
        uploadMethod = 'google_cloud_storage';
        
        console.log('✅ Image uploaded to Google Cloud Storage successfully');
        console.log(`  - URL: ${imageUrl}`);
        console.log(`  - Destination: ${googleStorageDestination}`);
        
      } catch (storageError) {
        console.error('❌ Google Cloud Storage upload failed:', storageError);
        console.error('  - Error details:', storageError.message);
        console.error('  - Stack trace:', storageError.stack);
        
        // Fallback to local storage if Google Cloud Storage fails
        console.log('🔄 Falling back to local storage...');
        imageUrl = `/uploads/${req.file.filename}`;
        uploadMethod = 'local_fallback';
        console.log(`  - Fallback URL: ${imageUrl}`);
      }
    } else {
      // Use local storage if Google Cloud Storage is not configured
      console.log('📁 Google Cloud Storage not configured, using local storage');
      imageUrl = `/uploads/${req.file.filename}`;
      uploadMethod = 'local_only';
      console.log(`  - Local URL: ${imageUrl}`);
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
    console.log(`  - Order: ${image.order}`);

    // Get all user images to return
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

    res.json({
      message: 'Profile picture uploaded successfully',
      images: transformedImages,
      uploadMethod: uploadMethod
    });
  } catch (error) {
    console.error('❌ Upload profile picture error:', error);
    console.error('  - Error details:', error.message);
    console.error('  - Stack trace:', error.stack);
    
    // Clean up uploaded file if database operation fails
    if (req.file && req.file.path) {
      try {
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log(`🗑️  Cleaned up uploaded file: ${req.file.path}`);
        }
      } catch (cleanupError) {
        console.error('❌ Error cleaning up uploaded file:', cleanupError);
      }
    }
    
    res.status(500).json({ error: 'Server error during upload' });
  }
};

// @desc    Delete profile image
// @route   DELETE /api/profiles/images/:imageId
// @access  Private
const deleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await Image.findOne({
      where: { 
        id: imageId,
        userId: req.user.id 
      }
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Don't allow deletion if it's the only image
    const imageCount = await Image.count({
      where: { userId: req.user.id }
    });

    if (imageCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last image' });
    }

    // Delete from Google Cloud Storage if it has a destination
    if (image.googleStorageDestination && GoogleStorageService.isConfigured()) {
      try {
        const googleStorage = new GoogleStorageService();
        await googleStorage.deleteImage(image.googleStorageDestination);
        console.log('Image deleted from Google Cloud Storage:', image.googleStorageDestination);
      } catch (storageError) {
        console.error('Failed to delete from Google Cloud Storage:', storageError);
        // Continue with deletion even if Google Cloud Storage fails
      }
    }

    // If this was the primary image, make the next image primary
    if (image.isPrimary) {
      const nextImage = await Image.findOne({
        where: { userId: req.user.id },
        order: [['order', 'ASC'], ['createdAt', 'ASC']]
      });
      
      if (nextImage && nextImage.id !== image.id) {
        nextImage.isPrimary = true;
        await nextImage.save();
      }
    }

    await image.destroy();

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get all profiles (for admin)
// @route   GET /api/profiles
// @access  Private
const getAllProfiles = async (req, res) => {
  try {
    const profiles = await UserProfile.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });
    
    res.json(profiles);
  } catch (error) {
    console.error('Get all profiles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get profile by ID
// @route   GET /api/profiles/:id
// @access  Private
// @desc    Test Google Cloud Storage configuration
// @route   GET /api/profiles/test-gcs
// @access  Private
const testGCS = async (req, res) => {
  try {
    console.log('🧪 Testing Google Cloud Storage configuration...');
    
    // Check if GCS is configured
    const isConfigured = GoogleStorageService.isConfigured();
    console.log(`  - GCS configured: ${isConfigured}`);
    
    if (!isConfigured) {
      return res.json({
        configured: false,
        message: 'Google Cloud Storage is not configured',
        environment: {
          GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
          GOOGLE_CLOUD_BUCKET_NAME: process.env.GOOGLE_CLOUD_BUCKET_NAME,
          GOOGLE_CLOUD_CREDENTIALS: process.env.GOOGLE_CLOUD_CREDENTIALS ? 'SET' : 'NOT SET',
          NODE_ENV: process.env.NODE_ENV
        }
      });
    }
    
    // Test bucket access
    const googleStorage = new GoogleStorageService();
    await googleStorage.testBucketAccess();
    
    res.json({
      configured: true,
      message: 'Google Cloud Storage is working correctly',
      bucket: googleStorage.bucketName,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });
    
  } catch (error) {
    console.error('❌ GCS test failed:', error);
    res.status(500).json({
      configured: false,
      error: error.message,
      environment: {
        GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
        GOOGLE_CLOUD_BUCKET_NAME: process.env.GOOGLE_CLOUD_BUCKET_NAME,
        GOOGLE_CLOUD_CREDENTIALS: process.env.GOOGLE_CLOUD_CREDENTIALS ? 'SET' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV
      }
    });
  }
};

const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const profile = await UserProfile.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get user's images
    const images = await Image.findAll({
      where: { userId: profile.userId },
      attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
    
    // Transform images to match frontend expectations
    const transformedImages = images.map(image => ({
      id: image.id,
      imageUrl: image.imageUrl,
      isPrimary: image.isPrimary,
      order: image.order,
      uploadedAt: image.createdAt
    }));

    const profileData = profile.toJSON();
    const transformedProfile = {
      id: profileData.id,
      bio: profileData.bio,
      birthDate: profileData.birthDate,
      gender: profileData.gender,
      genderPreference: profileData.genderPreference,
      relationshipType: profileData.relationshipType,
      location: profileData.location,
      keyWords: profileData.keyWords,
      locationMode: profileData.locationMode,
      profilePicture: transformedImages.length > 0 ? transformedImages[0].imageUrl : null,
      images: transformedImages,
      user: {
        id: profileData.user.id,
        firstName: profileData.user.firstName,
        lastName: profileData.user.lastName,
        email: profileData.user.email,
        username: `${profileData.user.firstName} ${profileData.user.lastName}`.trim()
      },
      createdAt: profileData.createdAt,
      updatedAt: profileData.updatedAt
    };

    res.json(transformedProfile);
  } catch (error) {
    console.error('Get profile by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update image order
// @route   PUT /api/profiles/images/order
// @access  Private
const updateImageOrder = async (req, res) => {
  try {
    const { imageIds } = req.body;

    if (!imageIds || !Array.isArray(imageIds)) {
      return res.status(400).json({ error: 'Image IDs array is required' });
    }

    // Verify all images belong to the user
    const userImages = await Image.findAll({
      where: { 
        id: imageIds,
        userId: req.user.id 
      }
    });

    if (userImages.length !== imageIds.length) {
      return res.status(400).json({ error: 'Some images not found or do not belong to user' });
    }

    // Update the order of each image and set primary status
    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      const image = userImages.find(img => img.id.toString() === imageId.toString());
      
      if (image) {
        image.order = i;
        // Set the first image (order 0) as primary, others as non-primary
        image.isPrimary = (i === 0);
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

    profile.isHidden = true;
    await profile.save();

    res.json({ 
      message: 'Account hidden successfully',
      isHidden: true
    });
  } catch (error) {
    console.error('Hide account error:', error);
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

    profile.isHidden = false;
    await profile.save();

    res.json({ 
      message: 'Account unhidden successfully',
      isHidden: false
    });
  } catch (error) {
    console.error('Unhide account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get account visibility status
// @route   GET /api/profiles/visibility
// @access  Private
const getAccountVisibility = async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ 
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ 
      isHidden: profile.isHidden
    });
  } catch (error) {
    console.error('Get account visibility error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getPotentialMatches,
  uploadProfilePicture,
  deleteImage,
  getAllProfiles,
  getProfileById,
  updateImageOrder,
  testGCS,
  hideAccount,
  unhideAccount,
  getAccountVisibility
}; 