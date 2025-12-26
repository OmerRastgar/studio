import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ZoomIn, ZoomOut, RotateCw, MessageSquare, Plus, MapPin, X, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Tile {
    id: string;
    data: string; // Base64
}

interface PageData {
    width: number;
    height: number;
    rows: number;
    cols: number;
    tiles: Tile[];
    key: number[];
}

interface Annotation {
    id: string;
    text: string;
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    page: number;
    author: {
        id: string;
        name: string;
        role: string;
    };
    createdAt: string;
}

export function VisualCanvas({ objectKey, token, evidenceId }: { objectKey: string, token: string | null, evidenceId: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [pageData, setPageData] = useState<PageData | null>(null);

    // Viewport State
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Annotations State
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isCommentMode, setIsCommentMode] = useState(false);
    const [newAnnotation, setNewAnnotation] = useState<{ x: number, y: number } | null>(null);
    const [commentText, setCommentText] = useState("");
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

    // Fetch Metadata (Page Count)
    useEffect(() => {
        if (!token || !objectKey) return;
        fetch(`/api/secure-view/meta?key=${encodeURIComponent(objectKey)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.pages) setTotalPages(data.pages);
            })
            .catch(err => console.error("Meta fetch error:", err));
    }, [objectKey, token]);

    // Fetch Annotations
    useEffect(() => {
        if (!token || !evidenceId) return;
        fetch(`/api/evidence/${evidenceId}/annotations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.data) setAnnotations(data.data);
            })
            .catch(err => console.error("Annotations fetch error:", err));
    }, [evidenceId, token, page]); // Re-fetch on page change not strictly needed if we filter client-side, but API gets all? Typically API gets all for evidence.

    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetch Shredded Data
    useEffect(() => {
        if (!token || !objectKey) return;
        setLoading(true);
        fetch(`/api/secure-view/visual?page=${page}&key=${encodeURIComponent(objectKey)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error(`Status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                setPageData(data);
                setLoading(false);

                // Auto-fit scale to viewport
                if (wrapperRef.current) {
                    const containerW = wrapperRef.current.clientWidth - 60; // Padding safety
                    const containerH = wrapperRef.current.clientHeight - 60;
                    if (containerW > 0 && containerH > 0) {
                        const ratioW = containerW / data.width;
                        const ratioH = containerH / data.height;
                        // Fit entirely within view, max 1.0 (actual size)
                        setScale(Math.min(ratioW, ratioH, 1));
                    }
                }
            })
            .catch(err => {
                console.error("Viewer error:", err);
                setLoading(false);
            });
    }, [objectKey, token, page]);

    // Draw Canvas (No Rotation in Context)
    useEffect(() => {
        if (!pageData || !canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        const tileImages: HTMLImageElement[] = new Array(pageData.tiles.length);
        let loadedCount = 0;

        pageData.tiles.forEach((tile, shuffledIndex) => {
            const img = new Image();
            img.src = `data:image/jpeg;base64,${tile.data}`;
            img.onload = () => {
                tileImages[shuffledIndex] = img;
                loadedCount++;
                if (loadedCount === pageData.tiles.length) {
                    drawAllTiles(ctx, pageData, tileImages);
                }
            };
        });

    }, [pageData, scale]); // Rotation removed from dep

    const drawAllTiles = (ctx: CanvasRenderingContext2D, data: PageData, images: HTMLImageElement[]) => {
        const { width, height, rows, cols, key } = data;
        const tileW = Math.floor(width / cols);
        const tileH = Math.floor(height / rows);

        ctx.save();
        // Only Scale, NO ROTATION in canvas context
        // Center the drawing in the canvas if needed, but since canvas size == image size * scale, 0,0 is fine.
        ctx.scale(scale, scale);

        key.forEach((correctIndex, shuffledIndex) => {
            const img = images[shuffledIndex];
            if (!img) return;

            const row = Math.floor(correctIndex / cols);
            const col = correctIndex % cols;

            const x = col * tileW;
            const y = row * tileH;

            ctx.drawImage(img, x, y);
        });

        ctx.restore();
    };

    const [notifyCustomer, setNotifyCustomer] = useState(false);

    const handleContainerClick = (e: React.MouseEvent) => {
        if (!isCommentMode || !pageData || !containerRef.current) return;

        // Get coordinates relative to the CONTAINER (which holds the image)
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        // Calculate x/y relative to the element (accounting for rotation visually mapped to local coords? No)
        // Wait, getBoundingClientRect returns the box AFTER transform.
        // e.nativeEvent.offsetX is relative to the target element's padding box.
        // If we click on the container ref:
        // offsetX / clientWidth should give percentage relative to the box.

        // However, we want strict percentages of the original image.
        // Using nativeEvent.offsetX seems safest if we click directly on the container/overlay.

        const offsetX = e.nativeEvent.offsetX;
        const offsetY = e.nativeEvent.offsetY;

        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;

        const xPct = (offsetX / width) * 100;
        const yPct = (offsetY / height) * 100;

        setNewAnnotation({ x: xPct, y: yPct });
        setCommentText(""); // Reset text
        setNotifyCustomer(false); // Reset checkbox
    };

    const saveAnnotation = async () => {
        if (!newAnnotation || !commentText.trim()) return;

        try {
            const res = await fetch(`/api/evidence/${evidenceId}/annotations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    text: commentText,
                    x: newAnnotation.x,
                    y: newAnnotation.y,
                    page: page,
                    notifyCustomer // Pass this
                })
            });

            if (res.ok) {
                const data = await res.json();
                setAnnotations(prev => [...prev, data.data]);
                setNewAnnotation(null);
                setIsCommentMode(false);
                toast({ title: "Comment Added", description: "Your annotation has been saved." });
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Could not save comment." });
        }
    };

    if (loading && !pageData) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-500" /></div>;

    const currentAnnotations = annotations.filter(a => a.page === page);

    return (
        <div className="flex flex-col h-full w-full items-center">
            {/* Toolbar */}
            <div className="flex gap-2 mb-4 bg-slate-800 p-2 rounded-lg shadow-lg items-center z-10">
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1 hover:bg-slate-700 rounded text-slate-200"><ZoomOut size={18} /></button>
                <span className="text-xs self-center w-12 text-center text-slate-300">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1 hover:bg-slate-700 rounded text-slate-200"><ZoomIn size={18} /></button>

                <div className="w-px bg-slate-600 mx-1 h-6"></div>

                <button onClick={() => setRotation(r => r + 90)} className="p-1 hover:bg-slate-700 rounded text-slate-200"><RotateCw size={18} /></button>

                <div className="w-px bg-slate-600 mx-1 h-6"></div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed text-slate-200"
                    >
                        Prev
                    </button>
                    <span className="text-xs text-slate-300 min-w-[5rem] text-center">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed text-slate-200"
                    >
                        Next
                    </button>
                </div>

                <div className="w-px bg-slate-600 mx-1 h-6"></div>

                <button
                    onClick={() => setIsCommentMode(!isCommentMode)}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs transition-colors ${isCommentMode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                >
                    <MessageSquare size={14} />
                    {isCommentMode ? 'Click to pin' : 'Add Comment'}
                </button>
            </div>

            {/* Content Area */}
            <div
                ref={wrapperRef}
                className="flex-1 overflow-auto w-full flex relative"
            >
                <div className="m-auto min-w-fit min-h-fit p-8">
                    {pageData && (
                        /* The Transforming Wrapper */
                        <div
                            className="relative shadow-2xl transition-transform duration-300 ease-out"
                            style={{
                                width: pageData.width * scale,
                                height: pageData.height * scale,
                                transform: `rotate(${rotation}deg)`,
                                cursor: isCommentMode ? 'crosshair' : 'default'
                            }}
                        >
                            {/* Canvas Layer */}
                            <canvas
                                ref={canvasRef}
                                width={pageData.width * scale}
                                height={pageData.height * scale}
                                className="bg-white block"
                            />

                            {/* Interactive Overlay Layer */}
                            <div
                                ref={containerRef}
                                className="absolute inset-0 z-10"
                                onClick={handleContainerClick}
                            >
                                {/* Existing Annotations */}
                                {currentAnnotations.map(ann => (
                                    <div
                                        key={ann.id}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                                        style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                                    >
                                        <div
                                            className="text-red-500 bg-white rounded-full p-1 shadow-md cursor-pointer hover:scale-110 transition-transform"
                                            style={{ transform: `rotate(-${rotation}deg)` }} // Counter-rotate icon
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedAnnotationId(selectedAnnotationId === ann.id ? null : ann.id);
                                            }}
                                        >
                                            <MapPin fill="currentColor" size={24} />
                                        </div>

                                        {/* Tooltip / Label */}
                                        {selectedAnnotationId === ann.id && (
                                            <div
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white text-slate-900 p-2 rounded shadow-xl text-xs z-50 border border-slate-200"
                                                style={{ transform: `translate(-50%, 0) rotate(-${rotation}deg)` }} // Counter-rotate popup
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <div className="font-bold mb-1">{ann.author?.name}</div>
                                                <p>{ann.text}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* New Annotation Input */}
                                {newAnnotation && (
                                    <div
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-50"
                                        style={{ left: `${newAnnotation.x}%`, top: `${newAnnotation.y}%` }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-300 w-64" style={{ transform: `rotate(-${rotation}deg)` }}>
                                            <h4 className="text-slate-900 font-semibold mb-2 text-xs">Add Comment</h4>
                                            <textarea
                                                autoFocus
                                                className="w-full text-slate-800 text-sm border p-1 rounded mb-2 resize-none bg-slate-50 focus:ring-1 focus:ring-blue-500 outline-none"
                                                rows={3}
                                                value={commentText}
                                                onChange={e => setCommentText(e.target.value)}
                                                placeholder="Write your feedback..."
                                            />

                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="checkbox"
                                                    id="notifyCustomer"
                                                    checked={notifyCustomer}
                                                    onChange={(e) => setNotifyCustomer(e.target.checked)}
                                                    className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor="notifyCustomer" className="text-xs text-slate-600 cursor-pointer select-none">
                                                    Notify Customer
                                                </label>
                                            </div>

                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setNewAnnotation(null)}
                                                    className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={saveAnnotation}
                                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                                                >
                                                    <Save size={12} /> Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
