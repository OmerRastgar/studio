import express from 'express';
import { testConnection } from '../lib/prisma';

const router = express.Router();

// GET /api/health
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// GET /api/health/database
router.get('/database', async (req, res) => {
    try {
        const dbConnected = await testConnection();

        if (dbConnected) {
            res.json({
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                status: 'unhealthy',
                database: 'disconnected',
                error: 'Database connection failed',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'error',
            error: 'Health check failed',
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
