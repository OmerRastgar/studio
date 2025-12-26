import express from 'express';
import { viewerService } from '../services/viewerService';
import { minioClient, BUCKET_NAME } from '../index';

const router = express.Router();

/**
 * GET /v1/evidence/:id/visual?page=1
 * Returns shredded tiles for a document page.
 */
router.get('/visual', async (req, res) => {
    try {
        const key = req.query.key as string;
        const page = parseInt(req.query.page as string || '1');

        if (!key) throw new Error('Missing key parameter');

        console.log(`[VIEWER] GET /visual key=${key} page=${page}`);

        const result = await viewerService.processVisual(key, page);
        res.json(result);
    } catch (error: any) {
        console.error('Visual processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /v1/evidence/data
 * Returns parsed JSON for spreadsheets.
 */
router.get('/data', async (req, res) => {
    try {
        const key = req.query.key as string;
        if (!key) throw new Error('Missing key parameter');

        const result = await viewerService.processData(key);
        res.json(result);
    } catch (error: any) {
        console.error('Data processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /v1/evidence/meta
 * Returns metadata (e.g. page count).
 */
router.get('/meta', async (req, res) => {
    try {
        const key = req.query.key as string;
        if (!key) throw new Error('Missing key parameter');

        const result = await viewerService.getDocumentMetadata(key);
        res.json(result);
    } catch (error: any) {
        console.error('[VIEWER] Meta route error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stream audio file directly
router.get('/audio', async (req, res) => {
    try {
        const key = req.query.key as string;
        if (!key) throw new Error('Missing key parameter');

        // Get stat for headers
        const stat = await minioClient.statObject(BUCKET_NAME, key);

        // Determine MIME type
        const mime = require('mime-types');
        const contentType = mime.lookup(key) || stat.metaData['content-type'] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Accept-Ranges', 'bytes');

        const stream = await minioClient.getObject(BUCKET_NAME, key);
        stream.pipe(res);
    } catch (error: any) {
        console.error('Audio streaming error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
