"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/kratos-auth-provider";

export default function ProjectsRedirectPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            if (user.role === 'admin') {
                router.replace('/dashboard/admin/projects');
            } else if (user.role === 'manager') {
                router.replace('/dashboard/manager/projects');
            } else if (user.role === 'auditor') {
                router.replace('/dashboard/auditor/projects');
            } else if (user.role === 'customer') {
                router.replace('/dashboard'); // Customer projects are on dashboard
            } else {
                router.replace('/dashboard');
            }
        }
    }, [user, loading, router]);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
}
