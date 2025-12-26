
import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000/api';

async function verify() {
    console.log('--- Verifying Compliance Users API ---');

    // 1. Login as customer
    console.log('Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@example.com', password: 'password123' })
    });

    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Logged in as customer.');

    // 2. Fetch compliance users
    console.log('Fetching compliance users...');
    const usersRes = await fetch(`${API_URL}/compliance/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!usersRes.ok) {
        console.error('Fetch failed:', await usersRes.text());
        return;
    }

    const users = await usersRes.json();
    console.log('Compliance Users:', JSON.stringify(users, null, 2));
}

verify();
