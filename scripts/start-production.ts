import { config } from 'dotenv';

// Load environment variables
config();

console.log('🚀 Starting Langfuse Prompt Management API Server');
console.log('================================================');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 8080);
console.log('Langfuse URL:', process.env.LANGFUSE_BASE_URL);
console.log('Public Key:', process.env.LANGFUSE_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
console.log('Secret Key:', process.env.LANGFUSE_SECRET_KEY ? '✅ Set' : '❌ Missing');
console.log('================================================');

// Import and start the server
import('../src/api/server');
