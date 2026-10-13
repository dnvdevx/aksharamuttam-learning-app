/**
 * Auto-generate firebase_config.js from environment variables during Vercel build.
 * If firebase_config.js already exists (e.g. locally), it will not be overwritten.
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'firebase_config.js');

if (fs.existsSync(configPath)) {
    console.log('✓ firebase_config.js already exists. Skipping generation.');
    process.exit(0);
}

// Check if environment variables are provided (e.g. on Vercel)
const config = {
    apiKey: process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'thanima-learning-app.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'thanima-learning-app',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'thanima-learning-app.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '579369616649',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-SXK82SQ53Y'
};

// Also support single JSON string variable FIREBASE_CONFIG if user prefers
if (process.env.FIREBASE_CONFIG) {
    try {
        const parsed = typeof process.env.FIREBASE_CONFIG === 'string'
            ? JSON.parse(process.env.FIREBASE_CONFIG)
            : process.env.FIREBASE_CONFIG;
        Object.assign(config, parsed);
    } catch (e) {
        console.warn('Warning: Could not parse FIREBASE_CONFIG JSON string:', e.message);
    }
}

const fileContent = `/**
 * Generated automatically during build from environment variables.
 */
window.THANIMA_FIREBASE_CONFIG = ${JSON.stringify(config, null, 4)};
`;

fs.writeFileSync(configPath, fileContent, 'utf-8');
console.log('✓ Successfully generated firebase_config.js from environment variables.');
