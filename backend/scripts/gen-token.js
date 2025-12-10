const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'your-256-bit-secret-key-here-change-this-in-production';

// Use the ID of an Admin or Manager user found in DB
// I will fetch the first admin/manager from DB to be safe
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { role: { in: ['admin', 'manager'] } }
    });

    if (!user) {
        console.error('No admin/manager found!');
        process.exit(1);
    }

    const token = jwt.sign(
        { userId: user.id, role: user.role, email: user.email, name: user.name },
        secret,
        { expiresIn: '1h' }
    );

    console.log(`TOKEN_FOR_${user.role.toUpperCase()}: ${token}`);
    console.log(`USER_ID: ${user.id}`);

    // Test the API directly via Kong
    console.log('--- Testing /api/chat/contacts via Kong (localhost:8000) ---');
    try {
        const response = await fetch('http://kong-gateway:8000/api/chat/contacts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

main().finally(() => prisma.$disconnect());
