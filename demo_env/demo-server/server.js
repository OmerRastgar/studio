
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Mock data imports
const users = require('./data/users.json');
const projectsMetadata = require('./data/projects.json');

const app = express();
const port = 4000;

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Middleware to prevent caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(express.json());

// Serve Static Demo Data (Volume Mounted)
app.use('/demo-data', express.static('/app/demo-data'));

// Cookies / Session Mock
const SESSION_COOKIE_NAME = 'ory_kratos_session';
let activeSessions = {}; // simple in-memory session store { cookieVal: user }

// Helper to simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Request logger
app.use((req, res, next) => {
    console.log(`[MockServer] ${req.method} ${req.url}`);
    next();
});

// --- KRATOS MOCKS ---

app.use(express.urlencoded({ extended: true })); // Handle form submissions

app.get('/kratos/sessions/whoami', async (req, res) => {
    await delay(100);
    const cookie = req.headers.cookie || ''; // Safe default
    if (!cookie) return res.status(401).json({ error: "No session" });

    // Explicitly handle "No session"
    if (cookie.includes('logged_out')) return res.status(401).json({ error: "Logged out" });

    // Check for our mock cookie
    const match = cookie.match(/mock_user_role=([^;]+)/);
    const role = match ? match[1] : null;

    if (!role) {
        // Session might be from Kratos but no role set? Default to admin or 401
        // If we strictly check session token, we'd fail. 
        // For demo, if no role cookie, assume not logged in or default?
        // Let's return 401 to force login screen
        return res.status(401).json({ error: "No role session found" });
    }

    const user = users.find(u => u.role === role);
    if (!user) {
        console.error("[MockServer] Critical: User not found for role:", role);
        return res.status(500).json({ error: "Mock data integrity error: User not found" });
    }

    try {
        console.log(`[MockServer] /whoami returning user: ${user.email} (${user.role})`);
        res.json({
            id: "session_" + user.id,
            active: true,
            identity: {
                id: user.id,
                schema_id: "default",
                traits: {
                    email: user.email,
                    name: {
                        first: user.name.split(' ')[0],
                        last: user.name.split(' ')[1] || ''
                    }
                }
            }
        });
    } catch (e) {
        console.error("[MockServer] Error parsing user details in /whoami:", e);
        throw e;
    }
});

// Reusable Flow Response Generator
const getMockLoginFlow = (flowId) => ({
    id: flowId || "mock_flow_id",
    type: "browser",
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    issued_at: new Date().toISOString(),
    request_url: "http://localhost:4005/self-service/login/browser",
    ui: {
        // ACTION MUST BE RELATIVE to work with the Proxy strategy
        // The browser sees this as /kratos/... -> goes to 3001 -> Proxied to 4005
        action: "/kratos/self-service/login/browser?flow=" + (flowId || "mock_flow_id"),
        method: "POST",
        messages: [
            {
                id: 10001,
                type: "info",
                text: "Select a Role to Enter Demo Mode:"
            }
        ],
        nodes: [
            ...users.map(u => ({
                type: "input",
                group: "default",
                attributes: {
                    name: "role",
                    type: "submit",
                    value: u.role,
                    disabled: false,
                    node_type: "input"
                },
                meta: {
                    label: {
                        text: `Login as ${u.name} (${u.role})`,
                        type: "info"
                    }
                }
            })),
            // Add CSRF Token mock (required by many Kratos clients)
            {
                type: "input",
                group: "default",
                attributes: {
                    name: "csrf_token",
                    type: "hidden",
                    value: "mock_csrf_token",
                    required: true,
                    disabled: false,
                    node_type: "input"
                },
                meta: { label: { text: "" } }
            }
        ]
    }
});

app.get('/kratos/self-service/login/browser', (req, res) => {
    // Initiate Flow
    const flowId = req.query.flow || "mock_init_id";
    console.log("[MockServer] Returning Login Flow:", flowId);
    res.json(getMockLoginFlow(flowId));
});

app.get('/kratos/self-service/login/flows', (req, res) => {
    // Get Existing Flow
    const flowId = req.query.id;
    if (!flowId) return res.status(400).json({ error: "Missing flow ID" });
    console.log("[MockServer] Returning Existing Flow:", flowId);
    res.json(getMockLoginFlow(flowId));
});

app.post('/kratos/self-service/login/browser', async (req, res) => {
    await delay(500);
    // Frontend sends payload via form submit
    console.log("[MockServer] Login Submit:", req.body);
    const role = req.body.role || 'admin';
    const user = users.find(u => u.role === role);

    if (user) {
        res.cookie('mock_user_role', role, { httpOnly: true, path: '/' });
        res.cookie('ory_kratos_session', 'mock_session_token', { httpOnly: true, path: '/' });
        // Kratos expects a redirect or success response
        res.json({ session_token: "mock_token", session: { active: true } });
    } else {
        res.status(400).json({
            ui: {
                messages: [{ text: "Invalid Role Selected", type: "error" }]
            }
        });
    }
});

app.post('/api/demo/login', async (req, res) => {
    // Keep this for direct API usage
    await delay(300);
    const { role } = req.body;
    const user = users.find(u => u.role === role);

    if (user) {
        // Set a cookie that /whoami can read
        res.cookie('mock_user_role', role, { httpOnly: true, path: '/' });
        res.cookie('ory_kratos_session', 'mock_session_token', { httpOnly: true, path: '/' });
        res.json(user);
    } else {
        res.status(400).json({ error: "Invalid role" });
    }
});

app.post('/kratos/self-service/logout/browser', (req, res) => {
    res.cookie('mock_user_role', '', { maxAge: 0 });
    res.cookie('ory_kratos_session', '', { maxAge: 0 });
    res.cookie('logged_out', 'true', { httpOnly: true, path: '/' });
    res.json({ logout_url: "/" });
});


// --- APP API MOCKS ---

// USERS
app.get('/api/users', async (req, res) => {
    await delay(300);
    res.json(users);
});

app.get('/api/auth/me', async (req, res) => {
    // Forward to Kratos handler logic or reuse
    // This endpoint is often custom in the app
    await delay(100);
    const match = (req.headers.cookie || '').match(/mock_user_role=([^;]+)/);
    const role = match ? match[1] : 'admin';
    const user = users.find(u => u.role === role) || users[0];
    res.json(user);
});

// CHAT
app.get('/api/chat/contacts', async (req, res) => {
    await delay(300);
    res.json({
        success: true,
        data: users.map(u => ({ ...u, status: "online" }))
    });
});

app.get('/api/chat/conversations', async (req, res) => {
    await delay(300);
    res.json({ success: true, data: [] });
});

// EVIDENCE
app.get('/api/evidence', async (req, res) => {
    await delay(300);
    // Scan directory or return hardcoded?
    // Let's use hardcoded for now but point to static URLs
    // We can assume the volume mount is at /app/demo-data

    // Simple mock evidence list matching files we saw
    const evidenceList = [
        {
            id: "e1",
            projectId: "demo-project-iso27001",
            fileName: "Information Security Policy .pdf",
            fileUrl: "/demo-data/Test Data/Information Security Policy .pdf",
            type: "application/pdf",
            tags: ["Policy", "Governance"],
            uploadedAt: "2024-12-01T10:00:00Z",
            uploadedBy: users[3], // Customer
            controls: []
        },
        {
            id: "e2",
            projectId: "demo-project-pci",
            fileName: "Network Firewall Logs.log",
            fileUrl: "/demo-data/Test Data/Network Firewall Logs.log",
            type: "text/plain",
            tags: ["Log", "Security"],
            uploadedAt: "2024-12-02T11:00:00Z",
            uploadedBy: users[3],
            controls: []
        },
        {
            id: "e3",
            projectId: "demo-project-gdpr",
            fileName: "DATA PROTECTION & PRIVACY POLICY.pdf",
            fileUrl: "/demo-data/Test Data/DATA PROTECTION & PRIVACY POLICY.pdf",
            type: "application/pdf",
            tags: ["Privacy", "Policy"],
            uploadedAt: "2024-12-03T09:00:00Z",
            uploadedBy: users[3],
            controls: []
        }
    ];
    res.json(evidenceList);
});

// DASHBOARDS
app.get('/api/*/dashboard', async (req, res) => {
    await delay(300);
    res.json({
        stats: {
            assignedCustomers: 3,
            activeProjects: 3,
            pendingRequests: 5,
            upcomingEvents: 2,
            userTimeMetrics: {
                totalDuration: 120000,
                reviewDuration: 45000,
                auditDuration: 75000
            }
        }
    });
});

// USERS LIST FOR SELECTS
app.get(['/api/*/users', '/api/*/compliance-users', '/api/users'], async (req, res) => {
    await delay(300);
    res.json({ data: users });
});
app.post('/api/*/meeting', async (req, res) => {
    await delay(300);
    res.json({ success: true, message: "Meeting scheduled" });
});

// PROJECTS
app.get('/api/*/projects', async (req, res) => {
    await delay(300);
    const enrichedProjects = projectsMetadata.map(p => ({
        ...p,
        customerName: "Demo Customer",
        customerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Customer",
        frameworkName: p.framework,
        dueDate: "2024-12-31T00:00:00Z",
        role: "auditor",
        metrics: {
            progress: p.progress,
            completedControls: Math.floor((p.progress / 100) * 114), // approx 114 controls
            totalControls: 114,
            totalEvidence: 5
        }
    }));
    res.json({ success: true, data: enrichedProjects });
});

// PROJECT DETAILS
app.get('/api/*/projects/:id', async (req, res) => {
    await delay(300);
    const projectId = req.params.id;
    const project = projectsMetadata.find(p => p.id === projectId);

    if (!project) return res.status(404).json({ error: "Project not found" });

    res.json({
        success: true,
        data: {
            id: project.id,
            name: project.name,
            framework: {
                id: project.framework.toLowerCase().replace(' ', '-'),
                name: project.framework,
                version: "2024"
            },
            auditor: users.find(u => u.role === 'auditor'),
            customer: users.find(u => u.role === 'customer'),
            dueDate: "2024-12-31T00:00:00Z",
            // Simplified categories/controls for demo
            categories: [
                {
                    name: "Demo Category",
                    totalControls: 2,
                    completedControls: 1,
                    progress: 50,
                    controls: [
                        {
                            id: "c1",
                            controlId: "1.1",
                            code: "1.1",
                            title: "Demo Control 1",
                            description: "This is a demo control description from mock server.",
                            tags: ["Vital"],
                            progress: 100,
                            evidenceCount: 1,
                            evidence: [],
                            notes: "Satisfied."
                        },
                        {
                            id: "c2",
                            controlId: "1.2",
                            code: "1.2",
                            title: "Demo Control 2",
                            description: "Another control.",
                            tags: [],
                            progress: 0,
                            evidenceCount: 0,
                            evidence: [],
                            notes: null
                        }
                    ]
                }
            ],
            totalControls: 2,
            completedControls: 1,
            progress: 50
        }
    });
});

app.get('/api/*/projects/:id/assessment', async (req, res) => {
    await delay(300);
    res.json({
        success: true,
        data: {
            project: { id: req.params.id, name: "Demo Project" },
            projectEvidence: [],
            controls: [],
            isReviewer: true
        }
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("[MockServer] ERROR:", err);
    res.status(500).json({ error: "Internal Mock Server Error", details: err.message });
});

app.listen(port, () => {
    console.log(`Mock server running at http://localhost:${port}`);
    console.log(`Loaded ${users.length} users and ${projectsMetadata.length} projects.`);
});
