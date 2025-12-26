import React, { useState, useEffect } from 'react';
import { VisualCanvas } from './VisualCanvas';
import { DataGrid } from './DataGrid';
import { AudioPlayer } from './AudioPlayer';
import { Loader2 } from 'lucide-react';

interface SecureViewerProps {
    evidenceId: string; // Kept for context
    objectKey: string;  // The MinIO key
    filename: string;
    contentType: string;
    token: string | null;
    onClose?: () => void;
}

export function SecureViewer({ evidenceId, objectKey, filename, contentType, token, onClose }: SecureViewerProps) {
    const [viewType, setViewType] = useState<'visual' | 'data' | 'audio'>('visual');

    useEffect(() => {
        // Expanded detection matching backend capabilities
        const lowerType = contentType.toLowerCase();
        const lowerName = filename.toLowerCase();

        // 1. Audio/Video
        if (lowerType.includes('audio') || lowerType.includes('video')) {
            setViewType('audio');
        }
        // 2. Everything else -> VISUAL (Secure Image)
        else {
            setViewType('visual');
        }
    }, [contentType, filename]);

    return (
        <div
            className="flex flex-col h-full w-full bg-slate-950 text-white overflow-hidden relative"
            onContextMenu={(e) => {
                e.preventDefault();
                return false;
            }}
        >
            {/* Header / Toolbar */}
            <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900">
                <div className="flex items-center gap-2">
                    <span className="font-medium truncate max-w-md">{filename}</span>
                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">{viewType.toUpperCase()} MODE</span>
                </div>
                <div>
                    {onClose && (
                        <button onClick={onClose} className="flex items-center gap-2 text-sm hover:text-white text-slate-400">
                            <span className="text-lg">←</span> Back
                        </button>
                    )}
                </div>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 overflow-auto relative flex items-center justify-center p-4 bg-slate-950">
                {viewType === 'visual' && <VisualCanvas objectKey={objectKey} token={token} evidenceId={evidenceId} />}
                {viewType === 'data' && <DataGrid objectKey={objectKey} token={token} />}
                {viewType === 'audio' && <AudioPlayer objectKey={objectKey} filename={filename} token={token} />}


            </div>

            {/* Security Overlay (extra protection against screen scrapers?) */}
            {/* Security Overlay (CSS Noise) */}
            <div
                className="pointer-events-none absolute inset-0 z-50 mix-blend-overlay opacity-10"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            ></div>
        </div>
    );
}
