import type { LucideIcon } from "lucide-react";

export type User = {
  name: string;
  email: string;
  avatarUrl: string;
  role: 'admin' | 'auditor' | 'customer' | 'manager' | 'reviewer';
};

export type UserProfile = User & {
    id: string;
    status: 'Active' | 'Inactive';
    lastActive?: string;
}

export type Project = {
  id: string;
  name: string;
  customerName: string;
};

export type Evidence = {
  id: string;
  projectId: string;
  agentId?: string;
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
    name:string;
    avatarUrl: string;
  };
  action: string;
  details: string;
  timestamp: string;
  severity: 'Low' | 'Medium' | 'High';
};

export type Auditor = {
    id: string;
    name: string;
    avatarUrl: string;
    projects: string[];
    progress: number;
    status: 'Active' | 'Delayed' | 'On Hold';
    experience: string;
    certifications: string[];
}

export type Agent = {
  id: string;
  name: string;
  platform: 'windows' | 'macos' | 'linux';
  status: 'Active' | 'Inactive' | 'Pending';
  lastSync: string;
  version: string;
};

export type NavItem = {
  href: string;
  title: string;
  icon: LucideIcon;
  label?: string;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number;
  completionDate: string | null;
};

export type CustomerCourse = {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number;
  thumbnailUrl: string;
  completionDate: string | null;
};
