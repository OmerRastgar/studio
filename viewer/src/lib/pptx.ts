
import JSZip = require('jszip');
import * as path from 'path';

export async function parsePptx(buffer: Buffer): Promise<string> {
    const zip = new JSZip();
    try {
        await zip.loadAsync(buffer);
    } catch (e) {
        return `
        <html><body style="padding:40px; font-family:sans-serif; text-align:center; color:#666;">
            <h3>Unsupported File Format</h3>
            <p>This file appears to be corrupted or not a valid .pptx file.</p>
        </body></html>
        `;
    }

    // 1. Identify Slides
    // Recursive search for slide matches
    const slideFiles: string[] = [];
    zip.forEach((relativePath) => {
        if (relativePath.match(/ppt\/slides\/slide\d+\.xml$/i)) {
            slideFiles.push(relativePath);
        }
    });

    slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0');
        const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0');
        return numA - numB;
    });

    let slidesHtml = '';

    for (const fileName of slideFiles) {
        const slideXml = await zip.file(fileName)?.async('string');
        if (!slideXml) continue;

        const slideNumber = fileName.match(/slide(\d+)\.xml/i)?.[1] || '?';

        // 2. Parse Relationships for this slide to find Images
        // Rel file: ppt/slides/_rels/slideX.xml.rels
        const relFileName = fileName.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
        const relXml = await zip.file(relFileName)?.async('string');

        const imageMap: Record<string, string> = {}; // rId -> base64

        if (relXml) {
            // Find all Relationships with Type=".../image"
            // <Relationship Id="rId2" Type=".../image" Target="../media/image1.jpeg"/>
            const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Type="[^"]*image"[^>]*Target="([^"]+)"/g;
            let relMatch;
            while ((relMatch = relRegex.exec(relXml)) !== null) {
                const rId = relMatch[1];
                const target = relMatch[2];
                // Target is usually "../media/image1.jpeg" relative to "ppt/slides/"
                // So full path in zip is "ppt/media/image1.jpeg"
                // Resolve path:
                const rigidPath = target.replace('../', 'ppt/');

                const imgFile = zip.file(rigidPath);
                if (imgFile) {
                    const imgBase64 = await imgFile.async('base64');
                    // Guess mime type from extension
                    const ext = path.extname(rigidPath).toLowerCase().replace('.', '');
                    const mime = ext === 'jpg' ? 'jpeg' : ext; // simple mapping
                    imageMap[rId] = `data:image/${mime};base64,${imgBase64}`;
                }
            }
        }

        // 3. Extract Content (Text AND Images)
        // We want to preserve order roughly. 
        // We can find all occurrences of <a:t> or <a:blip>

        // Tokens:
        // Text: <a:t>...</a:t>
        // Image: <a:blip r:embed="rIdX">

        const tokenRegex = /(<a:t>.*?<\/a:t>)|(<a:blip[^>]*r:embed="([^"]+)"[^>]*>)/g;

        let slideContentHtml = '';
        let match;

        // To avoid extremely fragmented text (e.g. H H E L L O), we might want to buffer text?
        // But grouping <a:t> is hard if interleaved with visual tags. 
        // For now, let's just dump them. We can wrap text in <span>.

        while ((match = tokenRegex.exec(slideXml)) !== null) {
            // Group 1: Text (<a:t>...</a:t>)
            if (match[1]) {
                const textVal = match[1].replace(/<\/?a:t>/g, '');
                // Basic cleanup
                if (textVal) {
                    slideContentHtml += `<span class="t">${textVal}</span> `;
                }
            }
            // Group 2: Image (<a:blip...>)
            // Group 3: rId
            else if (match[2] && match[3]) {
                const rId = match[3];
                const imgSrc = imageMap[rId];
                if (imgSrc) {
                    slideContentHtml += `<div class="img-wrapper"><img src="${imgSrc}" /></div>`;
                }
            }
        }

        if (slideContentHtml.trim()) {
            slidesHtml += `
                <div class="slide">
                    <h3>Slide ${slideNumber}</h3>
                    <div class="content">
                        ${slideContentHtml}
                    </div>
                </div>
            `;
        } else {
            slidesHtml += `
                <div class="slide empty">
                    <h3>Slide ${slideNumber}</h3>
                    <p><em>(Empty Slide)</em></p>
                </div>
            `;
        }
    }

    if (!slidesHtml) {
        return `
        <html><body style="padding:40px; font-family:sans-serif; text-align:center; color:#666;">
            <h3>Extraction Failed</h3>
            <p>No content could be extracted.</p>
        </body></html>
        `;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #eee; }
                .slide { background: white; margin: 20px 0; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                h3 { margin-top: 0; color: #aaa; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
                .content { font-size: 16px; line-height: 1.6; color: #333; }
                .t { white-space: pre-wrap; }
                .img-wrapper { margin: 20px 0; text-align: center; }
                img { max-width: 100%; height: auto; border: 1px solid #eee; border-radius: 4px; }
            </style>
        </head>
        <body>${slidesHtml}</body>
        </html>
    `;
}
