import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('Checking Environment Variables...');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
console.log('EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL ? 'Present' : 'Missing');
console.log('BETTER_AUTH_URL:', process.env.BETTER_AUTH_URL ? 'Present' : 'Missing');
