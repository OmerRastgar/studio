import puppeteer from 'puppeteer';

/**
 * Renders an HTML string to a PNG buffer using Puppeteer (Headless Chrome).
 * This ensures that the content is visually represented but functionally inert (secure image).
 */
export async function renderHtmlToImage(htmlContent: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
        headless: true, // "new" is deprecated or typed differently in some versions, true is safe
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Critical for container environments
    });

    try {
        const page = await browser.newPage();

        // Set content with some basic styling to make it readable
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await page.setViewport({ width: 1200, height: 1600 }); // Default A4-ish ratio

        // Take a full page screenshot
        const screenshot = await page.screenshot({
            fullPage: true,
            encoding: 'binary',
            type: 'png'
        });

        return Buffer.from(screenshot);
    } finally {
        await browser.close();
    }
}

/**
 * Helper to wrap raw text in a styled HTML container for rendering.
 * @param text The raw text content
 * @param title Optional filename or title
 */
export function renderTextToHtml(text: string, title?: string): string {
    // 1. Strip anything that looks like a tag <...>
    // User requested "remove format like <text>". 
    // We replace them with a placeholder or empty string to be safe.
    let cleanText = text.replace(/<[^>]*>/g, " ");

    // 2. Remove "harmful" special characters, keep basic logic
    // User said "remove any special characters and add space"
    // We'll keep alphanumeric, common punctuation, and whitespace.
    // Replace others with space.
    // Regex: Keep ONLY [a-zA-Z0-9 \n\r\t.,;:!?'"-]
    // Strictly alphanumeric + basic punctuation + whitespace.
    cleanText = cleanText.replace(/[^a-zA-Z0-9 \n\r\t.,;:!?'"\-]/g, " ");

    // 3. Normalize whitespace to prevent massive gaps (optional, but good for "add space")
    // Collapse multiple spaces (but keep newlines)
    cleanText = cleanText.replace(/[ \t]+/g, " ");

    // 4. Escape remaining HTML entities just in case (e.g. & " ' which we allowed above)
    const safeText = cleanText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;") // Should be none left, but safe
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Courier New', Courier, monospace; padding: 20px; background: #f5f5f5; }
                .container { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                h3 { margin-top: 0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                pre { white-space: pre-wrap; word-wrap: break-word; font-size: 14px; line-height: 1.5; color: #24292e; }
            </style>
        </head>
        <body>
            <div class="container">
                ${title ? `<h3>${title}</h3>` : ''}
                <pre>${safeText}</pre>
            </div>
        </body>
        </html>
    `;
}

/**
 * Helper to convert Excel/CSV JSON data into an HTML Table.
 */
export function renderTableToHtml(sheetName: string, rows: any[][]): string {
    const tableRows = rows.map((row, rIndex) => {
        const cells = row.map(cell => {
            const val = cell !== null && cell !== undefined ? String(cell) : '';
            const safeVal = val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return rIndex === 0
                ? `<th style="background:#f0f0f0;font-weight:bold;">${safeVal}</th>`
                : `<td>${safeVal}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #fff; }
                h2 { color: #444; }
                table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 14px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                th { background-color: #eee; }
            </style>
        </head>
        <body>
            <h2>Sheet: ${sheetName}</h2>
            <table>
                ${tableRows}
            </table>
        </body>
        </html>
    `;
}
