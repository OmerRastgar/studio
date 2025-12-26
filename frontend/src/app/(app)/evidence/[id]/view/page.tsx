'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SecureViewer } from '@/components/evidence/viewer/SecureViewer';
import { useAuth } from '@/components/auth/kratos-auth-provider';
import { useToast } from '@/hooks/use-toast';

export default function EvidenceViewPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const { toast } = useToast();
    const [metadata, setMetadata] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const evidenceId = params.id as string;

    useEffect(() => {
        if (!evidenceId) return;

        // In a real implementation, we would fetch metadata about the file 
        // (filename, mimeType) from the Backend API first.
        // For this prototype, I'll mock it or try to fetch it if available.
        // Let's assume we can get it from the main backend.

        // Fetch evidence details from Main Backend
        fetch(`/api/evidence/${evidenceId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to load evidence metadata");
                return res.json();
            })
            .then(data => {
                setMetadata(data.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast({
                    title: "Error",
                    description: "Could not load evidence details.",
                    variant: "destructive"
                });
                setLoading(false);
            });

    }, [evidenceId, token, toast]);

    const handleClose = () => {
        const projectId = metadata?.projectId;
        if (projectId) {
            router.push(`/evidence?projectId=${projectId}`);
        } else {
            router.push('/evidence');
        }
    };

    if (loading) {
        return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white">Loading Viewer...</div>
    }

    if (!metadata) {
        return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white">Evidence not found.</div>
    }

    // Determine contentType/filename/key from metadata
    // Adjust based on your actual API response structure
    const contentType = metadata.file?.mimeType || metadata.type || 'application/pdf';
    const filename = metadata.file?.originalName || metadata.fileName || 'Document';

    // Extract ObjectKey from fileUrl: "/api/uploads/download/PROJECTID/UUID.EXT" -> "PROJECTID/UUID.EXT"
    let objectKey = '';
    if (metadata.fileUrl) {
        const parts = metadata.fileUrl.split('/api/uploads/download/');
        if (parts.length > 1) {
            objectKey = parts[1];
        }
    }

    if (!objectKey) {
        // Fallback if URL structure doesn't match expected proxy pattern
        // Or try to reconstruct if we have projectId and fileName? No, UUID is used.
        // If fileUrl is null, we can't view it.
        return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white">Invalid Evidence URL.</div>;
    }

    return (
        <div className="fixed inset-0 overflow-hidden bg-black z-[100]">
            <SecureViewer
                evidenceId={evidenceId} // Still passed for logging? Or unused? Actually VisualCanvas needs key now.
                objectKey={objectKey}
                filename={filename}
                contentType={contentType}
                token={token}
                onClose={handleClose}
            />
        </div>
    );
}
