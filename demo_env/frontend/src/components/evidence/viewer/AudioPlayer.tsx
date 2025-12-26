import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Play, Pause, Volume2 } from 'lucide-react';

export function AudioPlayer({ objectKey, filename, token }: { objectKey: string, filename: string, token: string | null }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const [loading, setLoading] = useState(false);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

    // Load Audio into Memory (No file URL)
    useEffect(() => {
        const loadAudio = async () => {
            if (!token || !objectKey) return;
            setLoading(true);
            try {
                const response = await fetch(`/api/secure-view/audio?key=${encodeURIComponent(objectKey)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const arrayBuffer = await response.arrayBuffer();

                // Decode
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = context;

                const decodedBuffer = await context.decodeAudioData(arrayBuffer);
                setAudioBuffer(decodedBuffer);
                setLoading(false);
            } catch (err) {
                console.error("Audio load failed:", err);
                setLoading(false);
            }
        };

        if (objectKey) loadAudio();

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [objectKey, token]);

    const togglePlay = async () => {
        if (!audioContextRef.current || !audioBuffer) return;

        if (isPlaying) {
            // Stop
            if (sourceNodeRef.current) {
                sourceNodeRef.current.stop();
                sourceNodeRef.current = null;
            }
            setIsPlaying(false);
        } else {
            // Play
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start();

            source.onended = () => setIsPlaying(false);
            sourceNodeRef.current = source;
            setIsPlaying(true);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl max-w-sm">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                <Volume2 size={40} className="text-white" />
            </div>

            <h3 className="text-lg font-medium text-white mb-2 text-center break-words w-full truncate">{filename}</h3>
            <p className="text-sm text-slate-400 mb-8">Secure Audio Stream</p>

            <button
                onClick={togglePlay}
                disabled={!audioBuffer}
                className="w-16 h-16 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>

            <div className="mt-6 text-xs text-slate-500">
                Memory-only playback. Direct download disabled.
            </div>
        </div>
    );
}
