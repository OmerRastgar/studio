import { Router, Response } from 'express';
import multer from 'multer';
import { Client as MinioClient } from 'minio';
import { authenticate, AuthRequest } from '../middleware/auth';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// MinIO client configuration
const minioClient = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'auditace',
    secretKey: process.env.MINIO_SECRET_KEY || 'auditace123'
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'evidence';

// Allowed file types
const ALLOWED_EXTENSIONS = [
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp',
    // Audio
    '.mp3', '.wav', '.ogg', '.m4a',
    // Config/Logs
    '.json', '.xml', '.yaml', '.yml', '.log', '.config', '.ini'
];

const ALLOWED_MIME_TYPES = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    // Images
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
    // Config
    'application/json', 'application/xml', 'text/xml', 'text/yaml',
    'application/x-yaml', 'text/x-log', 'application/octet-stream'
];

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 20 // Max 20 files at once
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
        const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype) ||
            file.mimetype.startsWith('text/');

        if (isAllowedExt || isAllowedMime) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.originalname}`));
        }
    }
});

// Ensure bucket exists
async function ensureBucket() {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME);
            console.log(`Created MinIO bucket: ${BUCKET_NAME}`);
        }
    } catch (error) {
        console.error('Error ensuring bucket exists:', error);
    }
}

// Initialize bucket on module load
ensureBucket();

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/uploads
 * Upload one or more files to MinIO
 * Returns array of { fileUrl, fileName, type, size }
 */
router.post('/', upload.array('files', 20), async (req: AuthRequest, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files provided' });
        }

        const userId = req.user?.userId;
        const projectId = req.body.projectId;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        const uploadResults = [];

        for (const file of files) {
            // Generate unique filename
            const ext = path.extname(file.originalname);
            const uniqueId = uuidv4();
            const objectName = `${projectId}/${uniqueId}${ext}`;

            // Upload to MinIO
            await minioClient.putObject(
                BUCKET_NAME,
                objectName,
                file.buffer,
                file.size,
                { 'Content-Type': file.mimetype }
            );

            // Generate URL (MinIO internal URL for now)
            const fileUrl = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${BUCKET_NAME}/${objectName}`;

            uploadResults.push({
                fileName: file.originalname,
                fileUrl,
                objectName,
                type: getFileType(file.mimetype, ext),
                size: file.size,
                mimeType: file.mimetype
            });
        }

        console.log(`Uploaded ${uploadResults.length} files to MinIO for project ${projectId}`);

        return res.status(201).json({
            success: true,
            files: uploadResults
        });
    } catch (error) {
        console.error('Error uploading files:', error);
        return res.status(500).json({ error: 'Failed to upload files' });
    }
});

/**
 * GET /api/uploads/:objectName
 * Get presigned URL for downloading a file
 */
router.get('/url/:projectId/:fileId', async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, fileId } = req.params;
        const objectName = `${projectId}/${fileId}`;

        // Generate presigned URL (valid for 1 hour)
        const presignedUrl = await minioClient.presignedGetObject(BUCKET_NAME, objectName, 3600);

        return res.json({ url: presignedUrl });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return res.status(500).json({ error: 'Failed to generate download URL' });
    }
});

/**
 * DELETE /api/uploads/:projectId/:fileId
 * Delete a file from MinIO
 */
router.delete('/:projectId/:fileId', async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, fileId } = req.params;
        const objectName = `${projectId}/${fileId}`;

        await minioClient.removeObject(BUCKET_NAME, objectName);

        return res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Error deleting file:', error);
        return res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Helper function to determine file type category
function getFileType(mimeType: string, ext: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || ext === '.doc' || ext === '.docx') return 'document';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || ext === '.xls' || ext === '.xlsx' || ext === '.csv') return 'spreadsheet';
    if (ext === '.json' || ext === '.xml' || ext === '.yaml' || ext === '.yml') return 'config';
    if (ext === '.log' || ext === '.txt') return 'log';
    return 'document';
}

export default router;
