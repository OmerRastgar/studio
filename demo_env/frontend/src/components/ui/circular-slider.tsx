'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CircularSliderProps {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    size?: number;
    strokeWidth?: number;
    trackColor?: string;
    progressColor?: string;
    onChange?: (value: number) => void;
    onCommit?: (value: number) => void;
    className?: string;
    readOnly?: boolean;
    snapValues?: number[];
}

export function CircularSlider({
    value,
    min = 0,
    max = 100,
    step = 1,
    size = 60,
    strokeWidth = 6,
    trackColor = "text-muted/20",
    progressColor = "text-primary",
    onChange,
    onCommit,
    className,
    readOnly = false,
    snapValues
}: CircularSliderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [internalValue, setInternalValue] = useState(value);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!isDragging) {
            setInternalValue(value);
        }
    }, [value, isDragging]);

    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    // Calculate progress relative to min/max
    const percentage = Math.min(Math.max((internalValue - min) / (max - min), 0), 1);
    const strokeDashoffset = circumference - percentage * circumference;

    const handleInteraction = useCallback((event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        if (readOnly) return;

        const svg = svgRef.current;
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
        const clientY = 'touches' in event ? event.touches[0].clientY : (event as MouseEvent).clientY;

        const dx = clientX - (rect.left + rect.width / 2);
        // Invert dy because SVG y-axis is downwards, but standard math is upwards for 90 deg at top
        const dy = (rect.top + rect.height / 2) - clientY;

        // Calculate angle in radians
        let angle = Math.atan2(dy, dx);
        // Convert to degrees: 0 is right (3 o'clock), 90 is top (12 o'clock), 180 is left, 270 is bottom
        let degrees = (angle * 180) / Math.PI;

        // We want 0 degrees to be at the top (12 o'clock)
        // Currently: 3 o'clock is 0
        // We need 12 o'clock to be start (0% progress), continuing clockwise
        // Standard atan2: 0=East, 90=North, 180=West, -90=South

        // Transform to: 0 at North, increasing Clockwise
        // Current: East=0, North=90, West=180, South=-90
        // Want: North=0, East=90, South=180, West=270

        // Formula: (90 - theta) % 360
        let clockwiseFromTop = (90 - degrees);
        if (clockwiseFromTop < 0) clockwiseFromTop += 360;

        // Now normalize to 0-1 range
        const newProgress = clockwiseFromTop / 360;

        // Clamp to step
        const range = max - min;
        let newValue = Math.round((newProgress * range + min) / step) * step;
        newValue = Math.max(min, Math.min(max, newValue));

        // Snap to specific values if provided
        if (snapValues && snapValues.length > 0) {
            newValue = snapValues.reduce((prev, curr) => {
                return (Math.abs(curr - newValue) < Math.abs(prev - newValue) ? curr : prev);
            });
        }

        setInternalValue(newValue);
        onChange?.(newValue);
    }, [max, min, step, onChange, readOnly, snapValues]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (readOnly) return;
        setIsDragging(true);
        handleInteraction(e);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (readOnly) return;
        setIsDragging(true);
        handleInteraction(e);
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (isDragging) {
                e.preventDefault(); // Prevent scrolling while seeking
                handleInteraction(e);
            }
        };

        const handleUp = () => {
            if (isDragging) {
                setIsDragging(false);
                onCommit?.(internalValue);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMove, { passive: false });
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, handleInteraction, onCommit, internalValue]);

    return (
        <div className={cn("relative inline-flex items-center justify-center select-none", className)}>
            <svg
                ref={svgRef}
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className={cn("transform rotate-[-90deg]", readOnly ? "cursor-default" : "cursor-pointer")}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                {/* Track */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    className={cn("fill-none stroke-current", trackColor)}
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    className={cn("fill-none stroke-current transition-all duration-75", progressColor)}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </svg>
            <div
                className="absolute inset-0 flex items-center justify-center text-xs font-semibold pointer-events-none"
            >
                {Math.round(internalValue)}%
            </div>
        </div>
    );
}
