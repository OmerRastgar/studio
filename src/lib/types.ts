import type { LucideIcon } from "lucide-react";

export type User = {
  name: string;
  email: string;
  avatarUrl: string;
  role: 'admin' | 'auditor' | 'customer';
};

export type Evidence = {
  id: string;
  name: string;
  type: 'document' | 'screenshot' | 'log' | 'network' | 'config';
  tags: string[];
  uploadedAt: string;
  uploadedBy: string;
  previewUrl: string;
  aiHint: string;
};

export type AuditLog = {
  id: string;
  user: {
    name: string;
    avatarUrl: string;
  };
  action: string;
  details: string;
  timestamp: string;
  severity: 'Low' | 'Medium' | 'High';
};

export type NavItem = {
  href: string;
  title: string;
  icon: LucideIcon;
  label?: string;
};
