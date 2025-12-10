const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: body });
                }
            });
        });
        const http = require('http');

        function request(options, data) {
            return new Promise((resolve, reject) => {
                const req = http.request(options, (res) => {
                    let body = '';
                    res.on('data', (chunk) => body += chunk);
                    res.on('end', () => {
                        try {
                            resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
                        } catch (e) {
                            resolve({ statusCode: res.statusCode, data: body });
                        }
                    });
                });
                req.on('error', reject);
                if (data) req.write(JSON.stringify(data));
                req.end();
            });
        }

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
                            let data = '';
                            res.on('data', (chunk) => data += chunk);
                            res.on('end', () => {
                                console.log('Contacts Status:', res.statusCode);
                                console.log('Contacts Response:', data);
                            });
                        });
                        contactsReq.end();
                    } else {
                        ```javascript
const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

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
                        'Authorization': `Bearer ${ token } `
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        console.log('Contacts Status:', res.statusCode);
                        console.log('Contacts Response:', data);
                    });
                });
                contactsReq.end();
            } else {
                console.error('Login failed:', response);
            }
        });
    });

    loginReq.write(loginData);
    loginReq.end();
}

testChat();
```
