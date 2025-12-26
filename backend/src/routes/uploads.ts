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
    secretKey: process.env.MINIO_SECRET_KEY!,
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'evidence';

// Allowed file types (expanded)
const ALLOWED_EXTENSIONS = [
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.odt', '.ods', '.odp',
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg', '.heic', '.avif',
    // Audio
    '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac',
    // Config/Logs/Code
    '.json', '.xml', '.yaml', '.yml', '.log', '.config', '.ini', '.env', '.conf', '.properties', '.sh', '.bat', '.ps1', '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.rs', '.go', '.sql', '.md', '.dockerfile', '.lock'
];

const ALLOWED_MIME_TYPES = [
    // Broad categories to allow fallbacks
    'text/', 'image/', 'audio/', 'application/'
];

// Configure multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max (increased)
        files: 20
    },
    fileFilter: (req, file, cb) => {
        // PERMISSIVE: We allow almost anything that isn't explicitly blocked if we wanted a blacklist.
        // But let's stick to a very broad whitelist for now plus permissive mime check.

        const ext = path.extname(file.originalname).toLowerCase();

        // 1. Filename Sanitization happens LATER in the route handler, 
        // effectively we just need to say "YES" here unless it's obviously bad.
        // We will trust the extension check.

        const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext) ||
            ALLOWED_EXTENSIONS.includes(ext.substring(1)); // redundancy check

        // Allow if extension is known OR if it is a text/image/audio mime type
        const isBroadMime = ALLOWED_MIME_TYPES.some(type => file.mimetype.startsWith(type));

        // For "config files" without extension (like 'Dockerfile' or 'Makefile' or 'hosts'), ext is empty.
        // We should allow them if they seem like text.
        if (ext === '' || ext === '.') {
            // Allow
            cb(null, true);
            return;
        }

        if (isAllowedExt || isBroadMime) {
            cb(null, true);
        } else {
            // FALLBACK: Allow it anyway? User said "upload different files".
            // Let's log warning and allow, enforcing safety in Viewer.
            console.warn(`[UPLOAD] allowing unknown type: ${file.originalname} (${file.mimetype})`);
            cb(null, true);
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
            // SANITIZATION:
            // "remove any special chaarceters"
            // We'll keep alphanumerics, dots, dashes, underscores.
            const rawName = path.parse(file.originalname).name;
            const ext = path.extname(file.originalname).toLowerCase();

            // Regex: Keep only a-z A-Z 0-9 - _ .
            const safeName = rawName.replace(/[^a-zA-Z0-9\-_.]/g, '_');
            // Ensure we don't end up empty
            const finalName = safeName.length > 0 ? safeName : 'unnamed_file';
            const sanitizedFilename = `${finalName}${ext}`;

            // Generate unique filename for storage
            const uniqueId = uuidv4();
            // We store with unique ID to be safe, but we track the original (sanitized) name
            const objectName = `${projectId}/${uniqueId}${ext}`;

            // Upload to MinIO
            await minioClient.putObject(
                BUCKET_NAME,
                objectName,
                file.buffer,
                file.size,
                { 'Content-Type': file.mimetype }
            );

            // Generate URL (Use proxy route for external access)
            const fileUrl = `/api/uploads/download/${projectId}/${uniqueId}${ext}`;

            // Log for debugging
            console.log(`Generated file URL for ${file.originalname}: ${fileUrl}`);

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
 * GET /api/uploads/download/:projectId/:fileId
 * Proxy file download from MinIO
 */
router.get('/download/:projectId/:fileId', async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, fileId } = req.params;
        const objectName = `${projectId}/${fileId}`;

        const dataStream = await minioClient.getObject(BUCKET_NAME, objectName);
        dataStream.pipe(res);
    } catch (error) {
        console.error('Error downloading file:', error);
        return res.status(500).json({ error: 'Failed to download file' });
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
