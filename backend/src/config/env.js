require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiApiKeys: [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
  ].filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 209715200,
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,pptx,txt,md,ipynb,py,js,ts,jsx,tsx,java,c,cpp,h,hpp,go,rs,rb,php,swift,kt,scala,r,html,css,scss,json,xml,csv,yaml,yml,toml,sql,sh').split(','),
  allowedOrigins: [...new Set([...(process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','), 'https://studyrag.co'])],
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
};

console.log(`[Config] Environment: ${config.nodeEnv}`);
module.exports = config;
