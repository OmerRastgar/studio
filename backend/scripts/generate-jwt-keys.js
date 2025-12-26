#!/usr/bin/env node
/**
 * Generate RSA keypair for JWT signing
 * Run: node scripts/generate-jwt-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS_DIR = path.join(__dirname, '../keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'jwt-private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'jwt-public.pem');

// Create keys directory if it doesn't exist
if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
    console.log('✅ Created keys directory');
}

// Check if keys already exist
if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    console.log('⚠️  Keys already exist!');
    console.log(`   Private: ${PRIVATE_KEY_PATH}`);
    console.log(`   Public: ${PUBLIC_KEY_PATH}`);
    process.exit(0);
}

// Generate RSA keypair
console.log('🔐 Generating RS256 keypair...');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

// Write keys to files
fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

console.log('✅ RSA keypair generated successfully!');
console.log(`   Private key: ${PRIVATE_KEY_PATH}`);
console.log(`   Public key:  ${PUBLIC_KEY_PATH}`);
console.log('');
console.log('📋 Next steps:');
console.log('1. Add the public key to Kong jwt plugin configuration');
console.log('2. Restart backend service');
console.log('');
console.log('Kong configuration snippet:');
console.log('```yaml');
console.log('plugins:');
console.log('  - name: jwt');
console.log('    route: api-protected');
console.log('    config:');
console.log('      key_claim_name: iss');
console.log('      claims_to_verify: ["exp"]');
console.log('      rsa_public_key: |');
publicKey.split('\n').forEach(line => {
    console.log('        ' + line);
});
console.log('```');
