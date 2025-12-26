const http = require('http');

async function testChat() {
    // 1. Login as Manager
    const loginData = JSON.stringify({
        email: 'manager@auditace.com',
        password: 'manager123'
    });

    const loginReq = http.request({
        hostname: 'localhost',
        port: 8000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Login Status:', res.statusCode);

            try {
                const response = JSON.parse(data);

                if (response.token) {
                    console.log('Login successful, token received');
                    const token = response.token;

                    // 2. Get Contacts
                    const contactsReq = http.request({
                        hostname: 'localhost',
                        port: 8000,
                        path: '/api/chat/contacts',
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }, (res) => {
                        let contactData = '';
                        res.on('data', (chunk) => contactData += chunk);
                        res.on('end', () => {
                            console.log('Contacts Status:', res.statusCode);
                            console.log('Contacts Response:', contactData);
                        });
                    });
                    contactsReq.end();
                } else {
                    console.error('Login failed:', response);
                }
            } catch (e) {
                console.error('Error parsing login response:', e);
            }
        });
    });

    loginReq.write(loginData);
    loginReq.end();
}

testChat();
