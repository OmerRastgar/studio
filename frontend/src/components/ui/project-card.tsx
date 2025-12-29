"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CircularProgress } from "./circular-progress";
import { Folder, Calendar, User } from "lucide-react";

interface ProjectCardProps {
    id: string;
    name: string;
    framework: string;
    progress: number;
    dueDate?: string | null;
    auditor?: {
        name: string;
        email: string;
    } | null;
    controlsComplete: number;
    controlsTotal: number;
    onClick?: () => void;
    className?: string;
}

export function ProjectCard({
    name,
    framework,
    progress,
    dueDate,
    auditor,
    controlsComplete,
    controlsTotal,
    onClick,
    className,
}: ProjectCardProps) {
    const formattedDate = dueDate
        ? new Date(dueDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        : null;

    return (
        <div
            onClick={onClick}
            className={cn(
                "flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-0 justify-between p-4 rounded-lg bg-card border border-border hover:bg-accent/50 cursor-pointer transition-all duration-200 active:scale-[0.98]",
                className
            )}
        >
            <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Folder className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground truncate pr-2">{name}</h3>
                    <p className="text-sm text-muted-foreground">{framework}</p>
                    <div className="flex flex-col items-start gap-1 mt-1 text-xs text-muted-foreground">
                        {auditor && (
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {auditor.name}
                            </span>
                        )}
                        {formattedDate && (
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Due: {formattedDate}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <span className="text-sm text-muted-foreground">
                        {controlsComplete}/{controlsTotal} controls
                    </span>
                </div>
                <CircularProgress value={progress} size="md" />
            </div>
        </div>
    );
}
