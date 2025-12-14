
import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// GET /api/system/readme
router.get('/readme', (req, res) => {
    try {
        // Read from /app/README.md (mounted volume)
        const readmePath = path.join(process.cwd(), 'README.md');

        if (!fs.existsSync(readmePath)) {
            console.error('[DEBUG] README not found at:', readmePath);
            return res.status(404).json({ error: 'README.md not found' });
        }

        const content = fs.readFileSync(readmePath, 'utf-8');
        res.json({ success: true, content });
    } catch (error) {
        console.error('Error reading README:', error);
        res.status(500).json({ error: 'Failed to read README file' });
    }
});

export default router;
