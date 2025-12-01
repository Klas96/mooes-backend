# Dummy Profiles Database Seeding

This document explains how to add dummy profiles to the database for testing and development purposes.

## Available Scripts

### 1. Enhanced Seed (Recommended)
Clears the database and adds 28 diverse dummy profiles with realistic data:

```bash
npm run seed:enhanced
```

**Features:**
- 28 diverse profiles with different professions
- Mix of local and global location modes
- Realistic bios and keywords
- All emails verified for testing
- Diverse age ranges and locations

### 2. Add Dummy Profiles (Non-destructive)
Adds additional dummy profiles without clearing existing data:

```bash
npm run add-dummy-profiles
```

**Features:**
- Adds 20 new profiles
- Skips existing users to avoid duplicates
- Preserves existing data
- All emails verified for testing

### 3. Original Seed
Clears the database and adds 8 basic dummy profiles:

```bash
npm run seed
```

### 4. Complete Setup
Creates sample images and seeds the database:

```bash
npm run setup:enhanced  # Enhanced version
npm run setup          # Original version
```

## Profile Information

### Login Credentials
- **Email**: Various test emails (e.g., `john.doe@example.com`)
- **Password**: `password123` (for all users)
- **Email Verification**: All accounts are pre-verified

### Profile Diversity
The enhanced profiles include:
- **Professions**: Teachers, engineers, doctors, artists, chefs, pilots, etc.
- **Locations**: Major US cities (NYC, LA, SF, Seattle, Austin, etc.)
- **Age Range**: 25-35 years old
- **Gender Distribution**: Balanced mix of male and female profiles
- **Location Modes**: Mix of local and global search preferences

### Sample Profiles
1. **John Doe** - Adventure seeker and coffee enthusiast
2. **Jane Smith** - Creative soul who loves art and music
3. **Maria Garcia** - Bilingual teacher passionate about education
4. **James Wilson** - Software engineer and musician
5. **Sophia Chen** - Data scientist and yoga enthusiast
6. **Michael Rodriguez** - Chef and food blogger
7. **Olivia Thompson** - Environmental scientist and photographer
8. **William Lee** - Financial analyst and marathon runner
9. **Ava Martinez** - Nurse and animal rescue volunteer
10. **Benjamin Anderson** - Architect and urban planner

## Database Schema

### User Model
- `id` - Primary key
- `email` - Unique email address
- `password` - Hashed password
- `firstName` - User's first name
- `lastName` - User's last name
- `emailVerified` - Email verification status
- `isPremium` - Premium subscription status
- `isActive` - Account active status

### UserProfile Model
- `userId` - Foreign key to User
- `profilePicture` - Profile image URL
- `bio` - User biography (max 500 characters)
- `birthDate` - Date of birth
- `gender` - Gender (M/F/O)
- `genderPreference` - Preferred gender (M/W/B)
- `relationshipType` - Type of relationship sought
- `location` - City and state
- `latitude` - GPS latitude
- `longitude` - GPS longitude
- `keyWords` - Array of interests/keywords
- `locationMode` - Local or global search preference

## Usage Examples

### For Development Testing
```bash
# Start with a clean database and enhanced profiles
npm run seed:enhanced

# Test the app with 28 diverse profiles
```

### For Production-like Testing
```bash
# Add profiles without clearing existing data
npm run add-dummy-profiles

# Test with both real and dummy profiles
```

### For Quick Setup
```bash
# Complete setup with images and profiles
npm run setup:enhanced
```

## Notes

- All dummy profiles use placeholder images from dummyimage.com
- Birth dates are set to make users 25-35 years old
- All profiles are set up for casual relationships by default
- Location coordinates are not set (would need to be added manually)
- Keywords are profession and interest-based for realistic matching

## Troubleshooting

If you encounter issues:

1. **Database Connection**: Ensure your database is running and accessible
2. **Environment Variables**: Check that your `.env` file is properly configured
3. **Dependencies**: Run `npm install` to ensure all dependencies are installed
4. **Permissions**: Ensure you have write access to the database

## Customization

To add your own dummy profiles:

1. Edit the `enhancedUsers` and `enhancedProfiles` arrays in `scripts/enhanced-seed-data.js`
2. Follow the same structure as existing profiles
3. Run `npm run seed:enhanced` to apply changes

To modify existing profiles:

1. Edit the profile data in the appropriate script file
2. Re-run the seeding script
3. Note that this will clear existing data 