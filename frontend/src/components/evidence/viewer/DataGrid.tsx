import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SheetData {
    name: string;
    rows: any[][];
}

interface WorkbookData {
    sheets: SheetData[];
}

export function DataGrid({ objectKey, token }: { objectKey: string, token: string | null }) {
    const [data, setData] = useState<WorkbookData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSheet, setActiveSheet] = useState(0);

    useEffect(() => {
        if (!token || !objectKey) return;
        setLoading(true);
        fetch(`/api/secure-view/data?key=${encodeURIComponent(objectKey)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error(`Status: ${res.status}`);
                return res.json();
            })
            .then(d => {
                setData(d);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [objectKey, token]);

    if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-500" /></div>;
    if (!data) return <div className="text-slate-400">Failed to load data.</div>;

    const currentSheet = data.sheets[activeSheet];

    return (
        <div className="flex flex-col h-full w-full bg-white text-black rounded overflow-hidden">
            {/* Sheet Tabs */}
            <div className="flex bg-slate-100 border-b border-slate-300">
                {data.sheets.map((sheet, idx) => (
                    <button
                        key={sheet.name}
                        onClick={() => setActiveSheet(idx)}
                        className={`px-4 py-2 text-sm font-medium ${activeSheet === idx
                            ? 'bg-white border-b-2 border-green-500 text-green-700'
                            : 'text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {sheet.name}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-0">
                <table className="min-w-full border-collapse text-sm">
                    <tbody>
                        {currentSheet.rows.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx === 0 ? "bg-slate-50 font-bold" : ""}>
                                <td className="bg-slate-100 border border-slate-300 px-2 py-1 text-center w-10 text-xs font-mono text-slate-500 select-none">
                                    {rIdx + 1}
                                </td>
                                {row.map((cell: any, cIdx: number) => (
                                    <td key={cIdx} className="border border-slate-300 px-2 py-1 whitespace-nowrap min-w-[50px] max-w-[300px] overflow-hidden text-ellipsis">
                                        {cell !== null && cell !== undefined ? String(cell) : ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
