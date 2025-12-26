import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/kratos-auth-provider';

// Configuration
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (PROD)

export type ActivityType = 'writing' | 'attaching' | 'chat' | 'review';

interface UseActivityTrackerProps {
    projectId?: string | null;
    isDisabled?: boolean;
    defaultActivityType?: ActivityType;
}

export function useActivityTracker({ projectId, isDisabled = false, defaultActivityType }: UseActivityTrackerProps) {
    const { token } = useAuth();
    const [isActive, setIsActive] = useState(false);
    const [sessionSeconds, setSessionSeconds] = useState(0);

    // Use ref for fast updates without re-renders
    const lastActivityTimeRef = useRef<number>(Date.now());

    // Track specific activities aggregated over the heartbeat interval
    const activityBufferRef = useRef<Set<ActivityType>>(new Set());

    // Refs for intervals/timeouts to clear them on unmount
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to note activity occurred
    const trackActivity = useCallback((type?: ActivityType) => {
        if (isDisabled) return;
        lastActivityTimeRef.current = Date.now();

        const activityType = type || defaultActivityType;

        if (activityType) {
            activityBufferRef.current.add(activityType);
        }
        if (!isActive) {
            setIsActive(true);
        }
    }, [isDisabled, isActive, defaultActivityType]);

    // Heartbeat function
    const sendHeartbeat = useCallback(async () => {
        if (!projectId || !token || isDisabled || !isActive) return;

        // Check if idle
        if (Date.now() - lastActivityTimeRef.current > IDLE_TIMEOUT_MS) {
            setIsActive(false);
            return;
        }

        if (document.hidden) {
            return;
        }

        try {
            const activities = Array.from(activityBufferRef.current);
            activityBufferRef.current.clear();

            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

            await fetch(`${apiUrl}/api/auditor/projects/${projectId}/activity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    duration: HEARTBEAT_INTERVAL_MS / 1000,
                    activities
                })
            });

            // console.log('[ActivityTracker] Heartbeat sent for project:', projectId);
        } catch (error) {
            console.error('[ActivityTracker] Failed to send activity heartbeat', error);
        }
    }, [projectId, token, isDisabled, isActive]); // Removed lastActivityTime dependency

    // Setup global event listeners for idle detection
    useEffect(() => {
        if (isDisabled) return;

        const handleUserInteraction = () => trackActivity();

        window.addEventListener('mousemove', handleUserInteraction);
        window.addEventListener('keydown', handleUserInteraction);
        window.addEventListener('click', handleUserInteraction);
        window.addEventListener('scroll', handleUserInteraction);

        return () => {
            window.removeEventListener('mousemove', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
            window.removeEventListener('click', handleUserInteraction);
            window.removeEventListener('scroll', handleUserInteraction);
        };
    }, [isDisabled, trackActivity]);

    // Setup Heartbeat Interval
    useEffect(() => {
        if (isDisabled) return;

        setIsActive(true);
        lastActivityTimeRef.current = Date.now();

        heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

        return () => {
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        };
    }, [isDisabled, sendHeartbeat]);

    // Track seconds for UI display
    useEffect(() => {
        if (!isActive || isDisabled) return;

        const interval = setInterval(() => {
            setSessionSeconds(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, isDisabled]);

    // Reset session seconds when projectId changes
    useEffect(() => {
        setSessionSeconds(0);
    }, [projectId]);

    // Check for visibility change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                trackActivity();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [trackActivity]);

    return {
        isActive,
        trackActivity,
        sessionSeconds
    };
}
