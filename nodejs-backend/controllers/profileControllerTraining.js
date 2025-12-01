const fs = require('fs');
const { UserProfile, Image } = require('../models');
const LocalStorageService = require('../services/localStorageService');

const buildProfileResponse = async (profile, userId) => {
  const profileData = profile.toJSON();

  const images = await Image.findAll({
    where: { userId },
    attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
    order: [['order', 'ASC'], ['createdAt', 'ASC']],
  });

  profileData.images = images.map((image) => ({
    id: image.id,
    imageUrl: image.imageUrl,
    isPrimary: image.isPrimary,
    order: image.order,
    uploadedAt: image.createdAt,
  }));

  return profileData;
};

const ensureProfile = async (userId) => {
  let profile = await UserProfile.findOne({ where: { userId } });
  if (!profile) {
    profile = await UserProfile.create({ userId });
  }
  return profile;
};

const getMyProfile = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    const response = await buildProfileResponse(profile, req.user.id);
    res.json(response);
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const { bio, location, keyWords } = req.body;
    const profile = await ensureProfile(req.user.id);

    if (bio !== undefined) profile.bio = bio;
    if (location !== undefined) profile.location = location;
    if (keyWords !== undefined) profile.keyWords = Array.isArray(keyWords) ? keyWords : [];

    await profile.save();

    const response = await buildProfileResponse(profile, req.user.id);
    res.json(response);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    console.log('📤 Starting profile picture upload...');
    console.log(`  - User ID: ${req.user.id}`);
    console.log(`  - File present: ${!!req.file}`);
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`  - Original filename: ${req.file.originalname}`);
    console.log(`  - Stored filename: ${req.file.filename}`);
    console.log(`  - File path: ${req.file.path}`);
    console.log(`  - File size: ${req.file.size} bytes`);
    console.log(`  - MIME type: ${req.file.mimetype}`);

    // Check if file exists at the path multer saved it
    if (!fs.existsSync(req.file.path)) {
      console.error(`❌ File does not exist at path: ${req.file.path}`);
      return res.status(500).json({ error: 'Uploaded file not found' });
    }

    await ensureProfile(req.user.id);

    console.log('📁 Initializing LocalStorageService...');
    const storageService = new LocalStorageService();
    console.log(`  - Uploads directory: ${storageService.uploadsDir}`);
    
    console.log('📤 Uploading to local storage...');
    const uploadResult = await storageService.uploadImage(req.file.path, 'profiles');
    console.log(`✅ Upload successful: ${uploadResult.url}`);
    console.log(`  - Destination: ${uploadResult.destination}`);
    
    const imageUrl = uploadResult.url;

    // Clean up the original multer file (it's been processed and moved)
    if (req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`🗑️ Cleaned up temporary file: ${req.file.path}`);
      } catch (err) {
        console.error('⚠️ Error cleaning up temporary upload:', err);
      }
    }

    const imageCount = await Image.count({ where: { userId: req.user.id } });
    console.log(`  - Current image count: ${imageCount}`);

    const image = await Image.create({
      userId: req.user.id,
      imageUrl,
      isPrimary: imageCount === 0,
      order: imageCount,
    });

    console.log(`✅ Image record created: ID ${image.id}`);

    const response = await buildProfileResponse(await ensureProfile(req.user.id), req.user.id);

    console.log('✅ Upload completed successfully');
    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Error uploading profile picture:');
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    console.error('  - Error details:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteImage = async (req, res) => {
  try {
    const image = await Image.findOne({
      where: {
        id: req.params.imageId,
        userId: req.user.id,
      },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const storageService = new LocalStorageService();
    await storageService.deleteImage(image.imageUrl);

    await image.destroy();

    const response = await buildProfileResponse(await ensureProfile(req.user.id), req.user.id);

    res.json(response);
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateImageOrder = async (req, res) => {
  try {
    const { imageIds } = req.body;
    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ error: 'imageIds must be an array' });
    }

    const images = await Image.findAll({
      where: { userId: req.user.id },
    });

    const imageMap = new Map(images.map((img) => [img.id.toString(), img]));

    imageIds.forEach((id, index) => {
      const image = imageMap.get(id.toString());
      if (image) {
        image.order = index;
        image.isPrimary = index === 0;
      }
    });

    await Promise.all(Array.from(imageMap.values()).map((img) => img.save()));

    const response = await buildProfileResponse(await ensureProfile(req.user.id), req.user.id);

    res.json(response);
  } catch (error) {
    console.error('Error updating image order:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const hideAccount = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    profile.isHidden = true;
    await profile.save();

    res.json({ message: 'Account hidden', isHidden: true });
  } catch (error) {
    console.error('Error hiding account:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const unhideAccount = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    profile.isHidden = false;
    await profile.save();

    res.json({ message: 'Account visible', isHidden: false });
  } catch (error) {
    console.error('Error unhiding account:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAccountVisibility = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
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
  hideAccount,
  unhideAccount,
  getAccountVisibility,
};

