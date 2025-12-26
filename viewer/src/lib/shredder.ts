import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface Tile {
    id: string;
    data: string;    // Base64 encoded image data
    originalIndex: number;
}

export interface ShreddedPage {
    width: number;
    height: number;
    rows: number;
    cols: number;
    tiles: Tile[];
    key: number[];
}

/**
 * Slices an image buffer into a grid of tiles and shuffles them.
 */
export async function shredImage(imageBuffer: Buffer, rows = 10, cols = 10): Promise<ShreddedPage> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata');
    }

    const { width, height } = metadata;
    const tileWidth = Math.floor(width / cols);
    const tileHeight = Math.floor(height / rows);

    const tiles: Tile[] = [];
    const orderedTiles: Tile[] = [];

    // 1. Generate Tiles
    console.log(`[SHREDDER] Image dims: ${width}x${height}, Grid: ${rows}x${cols}. Tile: ${tileWidth}x${tileHeight}`);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const left = c * tileWidth;
            const top = r * tileHeight;

            // Adjust last row/col to catch remaining pixels due to rounding
            let currentWidth = (c === cols - 1) ? width - left : tileWidth;
            let currentHeight = (r === rows - 1) ? height - top : tileHeight;

            // Safety Clamp
            if (left + currentWidth > width) currentWidth = width - left;
            if (top + currentHeight > height) currentHeight = height - top;

            if (currentWidth <= 0 || currentHeight <= 0) {
                console.warn(`[SHREDDER] Skipped invalid tile: ${currentWidth}x${currentHeight} at ${left},${top}`);
                continue;
            }

            try {
                // Must clone() because sharp operations likely modify the pipeline state
                const buffer = await image.clone()
                    .extract({ left, top, width: currentWidth, height: currentHeight })
                    .jpeg({ quality: 80 })
                    .toBuffer();

                const tile: Tile = {
                    id: uuidv4(),
                    data: buffer.toString('base64'),
                    originalIndex: r * cols + c
                };

                orderedTiles.push(tile);
            } catch (err: any) {
                console.error(`[SHREDDER] Extract failed for tile r=${r} c=${c} [l=${left}, t=${top}, w=${currentWidth}, h=${currentHeight}]:`, err.message);
                throw err;
            }
        }
    }

    // 2. Shuffle Logic
    const shuffledTiles = [...orderedTiles].sort(() => Math.random() - 0.5);

    // Generate the Key based on the shuffled order
    const key = shuffledTiles.map(t => t.originalIndex);

    // Sanitize tiles (Remove originalIndex)
    const sanitizedTiles = shuffledTiles.map(t => ({
        id: t.id,
        data: t.data,
        originalIndex: -1
    }));

    return {
        width,
        height,
        rows,
        cols,
        tiles: sanitizedTiles,
        key
    };
}
