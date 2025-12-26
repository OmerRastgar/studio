
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Mock data imports - simplified for standalone
const users = require('./data/users.json');
const projectsMetadata = require('./data/projects.json');

const app = express();
const port = 4000; // Running on port 4000 to match backend port expectation or 3001 if mapping

app.use(cors({
    origin: true, // Allow all origins for demo
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Helper to simulate delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Request logger
app.use((req, res, next) => {
    console.log(`[MockServer] ${req.method} ${req.url}`);
    next();
});

// --- ROUTES ---

// USERS
app.get('/api/users', async (req, res) => {
    await delay(300);
    res.json(users);
});

app.get('/api/auth/me', async (req, res) => {
    await delay(300);
    // Return first user or look for specific logic
    res.json(users[0]);
});

app.post('/api/demo/login', async (req, res) => {
    await delay(500);
    const { role } = req.body;
    const user = users.find(u => u.role === role);
    if (user) {
        res.json(user);
    } else {
        res.status(400).json({ error: "Invalid role" });
    }
});

// CHAT
app.get('/api/chat/contacts', async (req, res) => {
    await delay(300);
    res.json({
        success: true,
        data: [
            { id: "demo-admin-id", name: "Demo Admin", email: "admin@demo.com", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin", status: "online" },
            { id: "demo-manager-id", name: "Demo Manager", email: "manager@demo.com", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Manager", status: "offline" }
        ]
    });
});

app.get('/api/chat/conversations', async (req, res) => {
    await delay(300);
    res.json({ success: true, data: [] });
});

// EVIDENCE
app.get('/api/evidence', async (req, res) => {
    await delay(300);
    res.json([
        {
            id: "e1",
            projectId: "demo-project-id",
            fileName: "Information Security Policy.pdf",
            fileUrl: "/demo-data/Test Data/Information Security Policy .pdf",
            type: "application/pdf",
            tags: ["Policy"],
            uploadedAt: "2024-12-01T10:00:00Z",
            uploadedBy: { id: "demo-user", name: "Demo User" },
            controls: []
        },
        {
            id: "e2",
            projectId: "demo-project-id",
            fileName: "Network Firewall Logs.log",
            fileUrl: "/demo-data/Test Data/Network Firewall Logs.log",
            type: "text/plain",
            tags: ["Log"],
            uploadedAt: "2024-12-02T11:00:00Z",
            uploadedBy: { id: "demo-user", name: "Demo User" },
            controls: []
        }
    ]);
});

// DASHBOARDS
app.get('/api/*/dashboard', async (req, res) => {
    await delay(300);
    res.json({
        stats: {
            assignedCustomers: 12,
            activeProjects: 5,
            pendingRequests: 3,
            upcomingEvents: 2,
            userTimeMetrics: {
                totalDuration: 45000,
                reviewDuration: 18000,
                auditDuration: 27000
            }
        }
    });
});

// USERS LIST (for meeting scheduling)
app.get(['/api/*/users', '/api/*/compliance-users', '/api/users'], async (req, res) => {
    await delay(300);
    const eligibleHosts = users.filter(u => ['manager', 'compliance', 'admin'].includes(u.role));
    res.json({ data: eligibleHosts });
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
            completedControls: Math.floor(p.progress / 10),
            totalControls: 10,
            totalEvidence: 5
        }
    }));
    res.json({ success: true, data: enrichedProjects });
});

// PROJECT DETAILS (Assessment)
app.get('/api/*/projects/:id', async (req, res) => {
    await delay(300);
    const projectId = req.params.id;

    // Check if this is the assessment endpoint (nested routing in express is tricky with wildcards)
    // If request url ends with /assessment, handled below hopefully, but let's be explicit
    // This handler catches /api/auditor/projects/123

    const project = projectsMetadata.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Mock detailed response
    res.json({
        success: true,
        data: {
            id: project.id,
            name: project.name,
            framework: {
                id: "iso-27001",
                name: project.framework,
                version: "2013"
            },
            auditor: {
                id: "demo-auditor-id",
                name: "Demo Auditor",
                email: "auditor@demo.com",
                avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Auditor"
            },
            dueDate: "2024-12-31T00:00:00Z",
            categories: [
                {
                    name: "A.5 Information Security Policies",
                    totalControls: 2,
                    completedControls: 1,
                    progress: 50,
                    controls: [
                        {
                            id: "c1",
                            controlId: "A.5.1.1",
                            code: "A.5.1.1",
                            title: "Policies for information security",
                            description: "Policy description...",
                            tags: ["High Priority", "Policy"],
                            progress: 100,
                            evidenceCount: 1,
                            evidence: [{
                                id: "e1",
                                name: "Information Security Policy.pdf",
                                fileUrl: "/demo-data/Test Data/Information Security Policy .pdf",
                                type: "application/pdf",
                                uploadedBy: "Demo Customer",
                                uploadedAt: "2024-12-01T10:00:00Z"
                            }],
                            notes: "Policy looks comprehensive."
                        },
                        {
                            id: "c2",
                            controlId: "A.5.1.2",
                            code: "A.5.1.2",
                            title: "Review of the policies",
                            description: "Review description...",
                            tags: ["Review"],
                            progress: 0,
                            evidenceCount: 0,
                            evidence: [],
                            notes: null
                        }
                    ]
                },
                {
                    name: "A.9 Access Control",
                    totalControls: 1,
                    completedControls: 1,
                    progress: 100,
                    controls: [
                        {
                            id: "c3",
                            controlId: "A.9.1.1",
                            code: "A.9.1.1",
                            title: "Access control policy",
                            description: "Access control description...",
                            tags: ["Access Control"],
                            progress: 100,
                            evidenceCount: 2,
                            evidence: [
                                { id: "e2", name: "Access Control Policy.pdf", fileUrl: "/demo-data/Test Data/ACCESS CONTROL POLICY.pdf", type: "application/pdf", uploadedBy: "Demo Customer", uploadedAt: "2024-12-05T14:30:00Z" }
                            ],
                            notes: "Logs show active monitoring."
                        }
                    ]
                }
            ],
            totalControls: 3,
            completedControls: 2,
            progress: 66
        }
    });
});

// REPORTS / ASSESSMENT
app.get('/api/*/projects/:id/assessment', async (req, res) => {
    await delay(300);
    const projectId = req.params.id;
    res.json({
        success: true,
        data: {
            project: { id: projectId, name: "Demo Project", totalDuration: 1200 },
            projectEvidence: [{ id: "e1", fileName: "Policy.pdf", fileUrl: "/demo-data/Test Data/Information Security Policy .pdf", tags: ["Policy"] }],
            controls: [
                {
                    id: "c1",
                    controlId: "A.5.1.1",
                    code: "A.5.1.1",
                    title: "Policies for information security",
                    observation: "Observed policy document.",
                    evidence: [{ id: "e1", fileName: "Policy.pdf", fileUrl: "/demo-data/Test Data/Information Security Policy .pdf", tags: [] }],
                    analysis: "AI Analysis: Compliant.",
                    isFlagged: false,
                    isResolved: true,
                    reviewerNotes: "Good.",
                    progress: 100,
                    tags: ["High Priority"]
                }
            ],
            isReviewer: true
        }
    });
});

// GENERIC PUT/POST fallback
app.use((req, res) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        res.json({ success: true, message: "Action simulated", data: { reviewerNotes: "Simulated Note", isFlagged: true } });
    } else {
        res.status(404).json({ message: "Mock endpoint not found" });
    }
});

app.listen(port, () => {
    console.log(`Mock server running at http://localhost:${port}`);
});
