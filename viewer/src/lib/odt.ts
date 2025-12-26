import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';

/**
 * Parses an ODT (OpenDocument Text) file buffer and extracts the text content as simple HTML.
 */
export async function parseOdt(buffer: Buffer): Promise<string> {
    try {
        const zip = new AdmZip(buffer);
        const contentXmlEntry = zip.getEntry('content.xml');

        if (!contentXmlEntry) {
            throw new Error('Invalid ODT file: content.xml not found');
        }

        const contentXml = contentXmlEntry.getData().toString('utf8');
        const result = await parseStringPromise(contentXml);

        // ODT Structure: office:document-content -> office:body -> office:text -> text:p
        const officeBody = result['office:document-content']?.['office:body']?.[0];
        const officeText = officeBody?.['office:text']?.[0];

        if (!officeText) {
            return '<p><em>Empty Document</em></p>';
        }

        let html = '<div class="odt-content">';

        // Helper to extract text from a node recursively
        const extractText = (node: any): string => {
            if (typeof node === 'string') return node;
            if (node._) return node._; // xml2js text content key

            // Handle spans, links, etc if needed. For now, simple text extraction.
            // ODT is complex. We'll try to join all sub-values.
            let text = '';
            if (typeof node === 'object') {
                for (const key in node) {
                    if (key === '$') continue; // Skip attributes
                    const children = Array.isArray(node[key]) ? node[key] : [node[key]];
                    children.forEach((child: any) => {
                        text += extractText(child);
                    });
                }
            }
            return text;
        };

        // Iterate paragraphs
        const paragraphs = officeText['text:p'] || [];
        for (const p of paragraphs) {
            const text = extractText(p);
            if (text && text.trim()) {
                // Escape HTML chars
                const safeText = text
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                html += `<p>${safeText}</p>`;
            }
        }

        // Iterate Headers
        const headers = officeText['text:h'] || [];
        for (const h of headers) {
            const text = extractText(h);
            if (text && text.trim()) {
                const level = h['$']?.['text:outline-level'] || '1';
                const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                html += `<h${level}>${safeText}</h${level}>`;
            }
        }

        html += '</div>';

        // Wrap in basic styling
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Times New Roman', Times, serif; padding: 40px; margin: 0 auto; max-width: 800px; line-height: 1.6; color: #000; }
                    .odt-content { background: white; padding: 0; }
                    p { margin-bottom: 1em; }
                    h1, h2, h3 { color: #2c3e50; }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;

    } catch (error: any) {
        console.error('Error parsing ODT:', error);
        throw new Error(`Failed to parse ODT file: ${error.message}`);
    }
}
