import { minioClient, BUCKET_NAME } from '../index';
import { renderPdfPage, getPdfPageCount } from '../lib/pdf-poppler';
import { shredImage, ShreddedPage } from '../lib/shredder';
import { parseExcel, WorkbookData } from '../lib/excel';
import { renderHtmlToImage, renderTextToHtml, renderTableToHtml } from '../lib/html-renderer';
import { parseOdt } from '../lib/odt';
import { parsePptx } from '../lib/pptx';
import * as mammoth from 'mammoth';
import path from 'path';

export class ViewerService {

    /**
     * Helper: Get file stream from MinIO
     */
    async getFileStream(fileId: string): Promise<NodeJS.ReadableStream> {
        return await minioClient.getObject(BUCKET_NAME, fileId);
    }

    /**
     * Helper: Get full file buffer from MinIO (for PDF/Excel/Processing)
     */
    async getFileBuffer(fileId: string): Promise<Buffer> {
        const stream = await this.getFileStream(fileId);
        const chunks: Buffer[] = [];
        return new Promise((resolve, reject) => {
            stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', err => reject(err));
        });
    }

    async processVisual(fileId: string, pageNumber: number = 1): Promise<ShreddedPage> {
        const ext = path.extname(fileId).toLowerCase();
        console.log(`[SERVICE] Processing visual for ${fileId}, ext=${ext}`);

        const buffer = await this.getFileBuffer(fileId);
        console.log(`[SERVICE] Got buffer size: ${buffer.length} bytes`);

        let imageBuffer: Buffer;

        try {
            // 1. PDF
            if (ext === '.pdf') {
                imageBuffer = await renderPdfPage(buffer, pageNumber);
            }
            // 2. Images (Sharp handles most formats)
            else if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif', '.svg', '.avif', '.heif', '.heic'].includes(ext)) {
                // Pass directly to shredder (it uses Sharp)
                imageBuffer = buffer;
            }
            // 3. Spreadsheets (Excel/CSV)
            else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
                console.log('[SERVICE] Converting Spreadsheet to Secure Image...');
                const workbook = await parseExcel(buffer);
                const sheet = workbook.sheets[0]; // TODO: Handle multiple sheets
                if (!sheet) throw new Error('Empty spreadsheet');

                const html = renderTableToHtml(sheet.name, sheet.rows);
                imageBuffer = await renderHtmlToImage(html);
            }
            // 4. Word Documents (DOCX)
            else if (ext === '.docx') {
                console.log('[SERVICE] Converting DOCX to Secure Image...');
                const result = await mammoth.convertToHtml({ buffer: buffer });
                if (!result.value) throw new Error('Empty document');

                const fullHtml = `
                    <html><body style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.6;">
                    ${result.value}
                    </body></html>
                `;
                imageBuffer = await renderHtmlToImage(fullHtml);
            }
            // 5. OpenDocument Text (ODT)
            else if (ext === '.odt') {
                console.log('[SERVICE] Converting ODT to Secure Image...');
                const html = await parseOdt(buffer);
                imageBuffer = await renderHtmlToImage(html);
            }
            // 6. PowerPoint (PPTX)
            else if (['.pptx', '.ppt', '.odp'].includes(ext)) {
                console.log('[SERVICE] Converting Slide Deck to Secure Image (via JSZip)...');
                // For now, simple text extraction. 
                // In future: could use 'pptx2html' or similar if better fidelity needed.
                const html = await parsePptx(buffer);
                imageBuffer = await renderHtmlToImage(html);
            }
            // 7. Text / Config / Code (Fallback)
            // We'll treat almost anything else as text if it's not a binary block-list
            // Common text extensions:
            else if (['.txt', '.log', '.json', '.yaml', '.yml', '.xml', '.md', '.ts', '.js', '.py', '.java', '.go', '.rs', '.c', '.h', '.cpp', '.css', '.html', '.sh', '.bat', '.env', '.ini', '.conf'].includes(ext)) {
                console.log('[SERVICE] Converting Text/Code (Explicit) to Secure Image...');
                const fullText = buffer.toString('utf8');
                const truncatedText = fullText.length > 50000 ? fullText.substring(0, 50000) + '\n...[Truncated]' : fullText;

                const html = renderTextToHtml(truncatedText, path.basename(fileId));
                imageBuffer = await renderHtmlToImage(html);
            }
            else {
                // FALLBACK: Try to render anything else as Text (e.g. Dockerfile, unknown config, etc)
                console.log(`[SERVICE] Unknown extension '${ext}', falling back to Text rendering...`);
                // Check if buffer looks binary? For now, we trust utf8 conversion to not explode, 
                // just might show garbage.
                const fullText = buffer.toString('utf8');
                // Basic binary check: look for lots of null bytes? 
                // For now, allow it. Secure Viewer's job is to render what it can.
                const truncatedText = fullText.length > 50000 ? fullText.substring(0, 50000) + '\n...[Truncated]' : fullText;
                const html = renderTextToHtml(truncatedText, path.basename(fileId));
                imageBuffer = await renderHtmlToImage(html);
            }

            // Shred it
            console.log(`[SERVICE] Shredding final image buffer...`);
            return await shredImage(imageBuffer);

        } catch (error: any) {
            console.error(`[SERVICE] Visual processing failed for ${ext}:`, error);
            throw error;
        }
    }

    /**
     * DATA ENGINE: Parse Excel/CSV
     * NOTE: This returns raw data. For HIGH SECURITY, this might be restricted.
     * The visual engine above is preferred for secure viewing.
     */
    async processData(fileId: string): Promise<WorkbookData> {
        const buffer = await this.getFileBuffer(fileId);
        return await parseExcel(buffer);
    }

    /**
     * METADATA: Get page count for PDF
     */
    async getDocumentMetadata(fileId: string): Promise<{ pages: number }> {
        const ext = path.extname(fileId).toLowerCase();
        if (ext !== '.pdf') return { pages: 1 }; // Most converted formats are single-page images for now

        const buffer = await this.getFileBuffer(fileId);
        const pages = await getPdfPageCount(buffer);
        return { pages };
    }
}

export const viewerService = new ViewerService();
