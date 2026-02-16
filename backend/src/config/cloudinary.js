// Cloudinary is no longer used for file storage (replaced by Supabase Storage).
// This file is kept for backward compatibility but is not imported anywhere.
const { v2: cloudinary } = require('cloudinary');
const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = require('./env');

if (cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
  });
}

module.exports = cloudinary;
