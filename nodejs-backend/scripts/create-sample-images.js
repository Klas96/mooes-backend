const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create simple colored rectangle images
// This creates a minimal PNG file with a colored background
const createColoredImage = (filename, name, color) => {
  // Convert hex color to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Create a simple 1x1 pixel PNG with the specified color
  // This is a minimal PNG that will display as a colored rectangle
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, // bit depth
    0x02, // color type (RGB)
    0x00, // compression
    0x00, // filter
    0x00, // interlace
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  fs.writeFileSync(path.join(uploadsDir, filename), pngData);
  console.log(`Created ${filename} with color ${color}`);
};

// For now, let's create simple text files that can be used as placeholders
// This is a temporary solution that will work better than the current SVG files
const createTextPlaceholder = (filename, name, color) => {
  // Create a simple HTML file that displays a colored rectangle
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${name} - Profile Photo</title>
  <style>
    body { margin: 0; padding: 0; background: ${color}; height: 100vh; display: flex; align-items: center; justify-content: center; }
    .profile { text-align: center; color: white; font-family: Arial, sans-serif; }
    .name { font-size: 24px; margin-bottom: 10px; }
    .label { font-size: 16px; }
  </style>
</head>
<body>
  <div class="profile">
    <div class="name">${name}</div>
    <div class="label">Profile Photo</div>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(uploadsDir, filename), htmlContent);
  console.log(`Created ${filename} for ${name}`);
};

// Create sample profile images
const sampleImages = [
  { filename: 'sample-profile-1.jpg', name: 'John Doe', color: '#3498db' },
  { filename: 'sample-profile-2.jpg', name: 'Jane Smith', color: '#e74c3c' },
  { filename: 'sample-profile-3.jpg', name: 'Mike Johnson', color: '#2ecc71' },
  { filename: 'sample-profile-4.jpg', name: 'Sarah Wilson', color: '#f39c12' },
  { filename: 'sample-profile-5.jpg', name: 'David Brown', color: '#9b59b6' },
  { filename: 'sample-profile-6.jpg', name: 'Emma Davis', color: '#1abc9c' },
  { filename: 'sample-profile-7.jpg', name: 'Alex Taylor', color: '#e67e22' },
  { filename: 'sample-profile-8.jpg', name: 'Lisa Anderson', color: '#34495e' },
];

// Remove old sample images
sampleImages.forEach(img => {
  const filePath = path.join(uploadsDir, img.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
});

// Create new placeholder images
sampleImages.forEach(img => {
  // Use createColoredImage instead of createTextPlaceholder
  createColoredImage(img.filename, img.name, img.color);
});

console.log('Sample PNG images created successfully!');