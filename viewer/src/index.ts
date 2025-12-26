import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client as MinioClient } from 'minio';

import viewRoutes from './routes/viewRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/v1/evidence', viewRoutes);

// MinIO Client Setup
const minioClient = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'auditace',
    secretKey: process.env.MINIO_SECRET_KEY || 'auditace123'
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'evidence';

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'studio-viewer' });
});

// Basic MinIO connectivity check
app.get('/health/storage', async (req, res) => {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        res.json({ status: 'ok', bucket: BUCKET_NAME, exists });
    } catch (error: any) {
        console.error('MinIO connection failed:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`[Viewer] Service listening on port ${port}`);
});

export { minioClient, BUCKET_NAME };
