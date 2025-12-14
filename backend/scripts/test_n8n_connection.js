const http = require('http');

const options = {
    hostname: 'n8n',
    port: 5678,
    path: '/webhook-test/schedule-meeting',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`PROBLEM: ${e.message}`);
});

req.write(JSON.stringify({
    auditorEmail: "test@example.com",
    title: "Test Meeting Title",
    duration: 60,
    endTime: "2024-12-25T13:00",
    date: "2024-12-25T12:00",
    reason: "Manual Test Script",
    attendees: "client@example.com"
}));
req.end();
