"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
    value: number; // 0-100
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    className?: string;
}

const sizes = {
    sm: { width: 32, strokeWidth: 3, fontSize: "text-xs" },
    md: { width: 48, strokeWidth: 4, fontSize: "text-sm" },
    lg: { width: 64, strokeWidth: 5, fontSize: "text-base" },
};

export function CircularProgress({
    value,
    size = "md",
    showLabel = true,
    className,
}: CircularProgressProps) {
    const { width, strokeWidth, fontSize } = sizes[size];
    const radius = (width - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(100, Math.max(0, value));
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div
            className={cn("relative inline-flex items-center justify-center", className)}
            style={{ width, height: width }}
        >
            <svg
                className="transform -rotate-90"
                width={width}
                height={width}
            >
                {/* Background circle */}
                <circle
                    cx={width / 2}
                    cy={width / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted opacity-20"
                />
                {/* Progress circle */}
                <circle
                    cx={width / 2}
                    cy={width / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-500 ease-out"
                />
            </svg>
            {showLabel && (
                <span
                    className={cn(
                        "absolute font-medium text-foreground",
                        fontSize
                    )}
                >
                    {Math.round(progress)}%
                </span>
            )}
        </div>
    );
}
