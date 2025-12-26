import * as XLSX from 'xlsx';

export interface SheetData {
    name: string;
    rows: any[][];
}

export interface WorkbookData {
    sheets: SheetData[];
}

/**
 * Parses an Excel or CSV buffer into a clean JSON structure.
 * Sanitize: We perform basic read, but deeper sanitization depends on what we render.
 * For now, we return raw values (strings/numbers) and avoid formulas if possible.
 */
export async function parseExcel(buffer: Buffer): Promise<WorkbookData> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets: SheetData[] = [];

    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON array of arrays (rows)
        // header: 1 means array of arrays
        // defval: '' ensures empty cells are empty strings, not null/undefined
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

        sheets.push({
            name: sheetName,
            rows
        });
    }

    return { sheets };
}
