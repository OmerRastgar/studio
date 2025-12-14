
'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export function ReadmeViewer() {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReadme = async () => {
            try {
                // Use relative path - Next.js rewrite or Kong gateway should handle proxying
                const response = await fetch('/api/system/readme');

                if (!response.ok) {
                    const text = await response.text();
                    console.error('[ReadmeViewer] Fetch error:', response.status, response.statusText, text);
                    throw new Error(`Failed to fetch README: ${response.status} ${response.statusText || 'Unknown Error'} - ${text.substring(0, 100)}`);
                }

                const data = await response.json();
                if (data.success) {
                    setContent(data.content);
                } else {
                    setError('Failed to load content');
                }
            } catch (err) {
                console.error('Error fetching readme:', err);
                setError('Error loading README. Please Ensure backend is running.');
            } finally {
                setLoading(false);
            }
        };

        fetchReadme();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                {error}
            </div>
        );
    }

    return (
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
        </article>
    );
}
