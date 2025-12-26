"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CircularProgress } from "./circular-progress";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: number | string;
    icon?: LucideIcon;
    isPercentage?: boolean;
    className?: string;
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    isPercentage = false,
    className,
}: StatsCardProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-6 rounded-lg bg-card border border-border",
                className
            )}
        >
            {Icon && (
                <Icon className="w-6 h-6 text-muted-foreground mb-2" />
            )}
            <span className="text-sm text-muted-foreground mb-1">{title}</span>
            {isPercentage && typeof value === "number" ? (
                <CircularProgress value={value} size="lg" />
            ) : (
                <span className="text-3xl font-bold text-foreground">{value}</span>
            )}
        </div>
    );
}
