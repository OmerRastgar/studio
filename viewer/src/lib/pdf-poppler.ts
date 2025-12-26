import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface PDFPageOptions {
    resolution?: number; // DPI, default 150
}

/**
 * Converts a specific page of a PDF to a PNG Buffer.
 * Uses 'pdftoppm' from poppler-utils directly for security & speed.
 */
export async function renderPdfPage(pdfBuffer: Buffer, page: number, options: PDFPageOptions = {}): Promise<Buffer> {
    const tempId = uuidv4();
    const inputPath = path.join('/tmp', `${tempId}.pdf`);
    const outputPrefix = path.join('/tmp', `${tempId}`);

    // Default options
    const dpi = options.resolution || 150;

    try {
        // 1. Write buffer to temp file (pdftoppm needs a file)
        await fs.writeFile(inputPath, pdfBuffer);

        // 2. Execute pdftoppm
        // -png: Output PNG format
        // -r: Resolution (DPI)
        // -f: First page (page number)
        // -l: Last page (same as first for single page)
        // -singlefile: Write to a single file named outputPrefix.png
        const command = `pdftoppm -png -r ${dpi} -f ${page} -l ${page} -singlefile "${inputPath}" "${outputPrefix}"`;

        await execAsync(command);

        // 3. Read the output file
        const outputPath = `${outputPrefix}.png`;
        const imageBuffer = await fs.readFile(outputPath);

        // 4. Cleanup
        await cleanup(inputPath, outputPath);

        return imageBuffer;
    } catch (error) {
        // Ensure cleanup happens even on error
        try {
            await cleanup(inputPath, `${outputPrefix}.png`);
        } catch (cleanupError) {
            // Ignore cleanup errors
        }
        throw new Error(`Failed to render PDF page: ${error}`);
    }
}

/**
 * Gets the total page count of a PDF.
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
    const tempId = uuidv4();
    const inputPath = path.join('/tmp', `${tempId}.pdf`);

    try {
        await fs.writeFile(inputPath, pdfBuffer);
        const { stdout } = await execAsync(`pdfinfo "${inputPath}"`);

        const match = stdout.match(/Pages:\s+(\d+)/);
        if (match && match[1]) {
            await fs.unlink(inputPath);
            return parseInt(match[1], 10);
        }
        throw new Error('Could not parse page count');
    } catch (error) {
        try { await fs.unlink(inputPath); } catch { }
        throw new Error(`Failed to get page count: ${error}`);
    }
}

async function cleanup(...paths: string[]) {
    await Promise.all(paths.map(async (p) => {
        try {
            await fs.unlink(p);
        } catch (e) {
            // Provide resilience if file already gone
        }
    }));
}
