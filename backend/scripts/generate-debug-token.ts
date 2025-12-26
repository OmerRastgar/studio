
import { generateKongJWT } from '../src/lib/jwt-kong';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const token = generateKongJWT({
    sub: 'debug-user-id',
    email: 'admin@example.com',
    role: 'admin',
    name: 'Debug Admin'
});

console.log('--- JWT TOKEN ---');
console.log(token);
console.log('--- END TOKEN ---');
