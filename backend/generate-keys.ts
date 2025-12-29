const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const vapidKeys = webpush.generateVAPIDKeys();
const envPath = path.join(__dirname, '..', '.env');

try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Remove old keys and garbage lines
    const lines = envContent.split('\n').filter(line =>
        !line.startsWith('NEXT_PUBLIC_VAPID_PUBLIC_KEY=') &&
        !line.startsWith('VAPID_PRIVATE_KEY=') &&
        !line.startsWith('VAPID_SUBJECT=') &&
        line.includes('=') // Basic cleanup of garbage lines without =
    );

    // Append new keys
    lines.push(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    lines.push(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
    lines.push(`VAPID_SUBJECT=mailto:admin@example.com`);

    fs.writeFileSync(envPath, lines.join('\n') + '\n');
    console.log('Successfully updated .env with new VAPID keys');
} catch (error) {
    console.error('Error updating .env:', error);
    process.exit(1);
}
