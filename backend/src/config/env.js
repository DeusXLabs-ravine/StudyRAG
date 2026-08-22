require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiApiKeys: [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    process.env.GEMINI_API_KEY_9,
    process.env.GEMINI_API_KEY_10,
    process.env.GEMINI_API_KEY_11,
    process.env.GEMINI_API_KEY_12,
    process.env.GEMINI_API_KEY_13,
    process.env.GEMINI_API_KEY_14,
    process.env.GEMINI_API_KEY_15,
  ].filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 209715200,
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,pptx,txt,md,ipynb,py,js,ts,jsx,tsx,java,c,cpp,h,hpp,go,rs,rb,php,swift,kt,scala,r,html,css,scss,json,xml,csv,yaml,yml,toml,sql,sh').split(','),
  allowedOrigins: [...new Set([...(process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','), 'https://studyrag.co', 'https://api.studyrag.co'])],
  webhookSecret: process.env.WEBHOOK_SECRET || null,
  resendApiKey: process.env.RESEND_API_KEY || null,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  // Cloudflare R2 (S3-compatible) — primary blob storage for documents + podcast audio
  r2AccountId: process.env.R2_ACCOUNT_ID,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2Bucket: process.env.R2_BUCKET,
  r2Endpoint: process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null),
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  monnifyKey: process.env.MONNIFY_API_KEY,
  monnifySecret: process.env.MONNIFY_SECRET_KEY,
  monnifyContractCode: process.env.MONNIFY_CONTRACT_CODE,
  paystackSecret: process.env.PAYSTACK_SECRET_KEY,
  appBaseUrl: process.env.APP_BASE_URL || 'https://studyrag.co',
  revenueCatWebhookAuth: process.env.REVENUECAT_WEBHOOK_AUTH || null,
  // Comma-separated emails that always get admin-unlimited access regardless of payment
  adminMaxEmails: (process.env.ADMIN_MAX_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
  paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET || null,
  paypalEnvironment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY || null,
  flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || null,
};

console.log(`[Config] Environment: ${config.nodeEnv}`);
if (process.env.PORT) {
  console.log(`[Config] Using platform-assigned port: ${process.env.PORT}`);
} else {
  console.log(`[Config] No PORT environment variable found, defaulting to: 5000`);
}

module.exports = config;
