'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { mockAgents } from '@/lib/data';
import type { Agent } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, PlusCircle, Search, Settings, Download, Trash2, Bot, Copy } from 'lucide-react';

const PlatformIcon = ({ platform }: { platform: Agent['platform'] }) => {
  switch (platform) {
    case 'windows':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M3,12V6.75L9,5.43V11.91L3,12M10,5.33L21,3V11.77L10,12M3,13L9,13.09V19.5L3,18.25V13M10,13.1L21,13.23V21L10,19.6V13.1" />
        </svg>
      );
    case 'macos':
      return (
         <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M20.94,13.04C20.46,14.53 19.31,15.91 18.2,16.59C17.08,17.27 15.68,17.5 14.73,17.5C12.2,17.5 10.6,16 9.17,16C7.66,16 5.86,17.13 4.6,18.33C6.39,20.5 8.5,21.5 10.5,21.5C12.16,21.5 13.79,20.8 15.1,19.64C16.3,18.57 17.15,17.14 17.5,15.54C17.5,15.54 17.5,15.53 17.5,15.53C17.5,15.5 17.47,15.43 17.5,15.41C19.12,14.54 19.88,12.75 19.78,11.03C18.15,11.23 16.5,12.23 15.5,13.23C14.73,12.24 14,11.05 14,9.81C14,8.14 14.88,6.88 16.14,6.13C15.3,4.92 13.88,4.5 12.73,4.5C10.7,4.5 8.94,5.63 7.84,5.63C6.28,5.63 4.88,4.5 3.5,4.5C4.04,6.43 5.56,8.13 7.5,9.23C8.12,9.61 8.78,9.88 9.5,10.05C9.4,10.32 9.33,10.61 9.33,10.88C9.33,12.87 10.5,14.33 12.06,14.33C13.5,14.33 14.7,13.11 15.97,13.11C17.2,13.11 18.1,13.67 19,13.67C19.05,13.67 19.08,13.68 19.13,13.66C18.9,12.8 18.5,11.83 17.5,11.03C18.5,10.03 19.8,8.83 19.9,6.93C21.5,7.16 22.31,8.75 22.35,9.63C22.08,11.05 21.4,12.35 20.94,13.04Z" />
        </svg>
      );
    case 'linux':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M12,2.05C11.75,2.05 11.5,2.05 11.24,2.05C11,2.05 10.75,2.05 10.5,2.06C8.47,2.2 6.5,2.83 4.9,4.05C3.96,4.78 2.83,6.38 2.83,7.76V11.2C2.83,12.35 3.3,13.5 3.93,14.38C3.93,14.38 3.93,14.38 3.94,14.39C4.5,15.17 5.25,15.82 6.16,16.28C4.5,16.92 3.5,17.43 3.5,18.43C3.5,19.23 4.22,19.88 5.2,20.35C5.87,20.69 6.83,21 8,21.24V21.25C9.91,21.78 11.71,22 12,22C12.29,22 14.09,21.78 16,21.25V21.24C17.17,21 18.13,20.69 18.8,20.35C19.78,19.88 20.5,19.23 20.5,18.43C20.5,17.43 19.5,16.92 17.84,16.28C18.75,15.82 19.5,15.17 20.06,14.39C20.07,14.38 20.07,14.38 20.07,14.38C20.7,13.5 21.17,12.35 21.17,11.2V7.76C21.17,6.38 20.04,4.78 19.1,4.05C17.5,2.83 15.53,2.2 13.5,2.06C13.25,2.05 13,2.05 12.76,2.05C12.5,2.05 12.25,2.05 12,2.05M9.5,6.24C9.75,6.13 10,6.06 10.27,6C10.27,6 10.27,6 10.27,6C10.53,5.92 10.79,5.88 11.05,5.83C11.5,5.75 12.5,5.75 13,5.83C13.21,5.88 13.47,5.92 13.73,6C14,6.06 14.25,6.13 14.5,6.24C15.14,6.5 15.5,7.25 15.5,8C15.5,8.25 15.42,8.5 15.28,8.74C14.73,9.66 13.75,10.25 12.6,10.3C12.4,10.25 12.2,10.25 12,10.25C11.8,10.25 11.6,10.25 11.4,10.3C10.25,10.25 9.27,9.66 8.72,8.74C8.58,8.5 8.5,8.25 8.5,8C8.5,7.25 8.86,6.5 9.5,6.24M6.16,8.27C5.9,8.53 5.68,8.76 5.5,9C5.32,8.76 5.1,8.53 4.84,8.27C4.6,8.04 4.5,7.7 4.5,7.55C4.5,6.91 5.3,6.38 6.09,6.38C6.38,6.38 6.64,6.46 6.84,6.63C6.7,6.86 6.5,7.11 6.33,7.34C6.32,7.35 6.31,7.36 6.3,7.38C6.27,7.41 6.25,7.45 6.22,7.48C5.83,8.12 5.88,8.18 6.16,8.27M17.84,8.27C18.12,8.18 18.17,8.12 17.78,7.48C17.75,7.45 17.73,7.41 17.7,7.38C17.69,7.36 17.68,7.35 17.67,7.34C17.5,7.11 17.3,6.86 17.16,6.63C17.36,6.46 17.62,6.38 17.91,6.38C18.7,6.38 19.5,6.91 19.5,7.55C19.5,7.7 19.4,8.04 19.16,8.27C18.9,8.53 18.68,8.76 18.5,9C18.68,8.76 18.9,8.53 19.16,8.27C18.9,8.53 18.68,8.76 18.5,9C18.32,8.76 18.1,8.53 17.84,8.27M13,11.5C13,11.78 12.78,12 12.5,12H11.5C11.22,12 11,11.78 11,11.5V11C11,10.72 11.22,10.5 11.5,10.5H12.5C12.78,10.5 13,10.72 13,11V11.5M10.84,12.75C10.84,12.75 10.84,12.75 10.83,12.75C10.5,13.12 10.06,13.41 9.56,13.59C9.03,13.78 8.44,13.84 7.84,13.75C7.23,13.66 6.69,13.43 6.25,13.06C5.8,12.68 5.5,12.18 5.39,11.62C5.27,11.05 5.36,10.45 5.63,9.91C5.9,9.36 6.34,8.91 6.88,8.62C7.15,8.47 7.45,8.38 7.75,8.38C7.94,8.38 8.13,8.41 8.31,8.47C8.5,8.53 8.68,8.62 8.84,8.73C8.55,9.22 8.44,9.75 8.5,10.25C8.58,10.75 8.83,11.22 9.2,11.58C9.58,11.95 10.05,12.2 10.56,12.28C10.65,12.42 10.74,12.58 10.84,12.75M17.13,8.62C17.66,8.91 18.1,9.36 18.37,9.91C18.64,10.45 18.73,11.05 18.61,11.62C18.5,12.18 18.2,12.68 17.75,13.06C17.31,13.43 16.77,13.66 16.16,13.75C15.56,13.84 14.97,13.78 14.44,13.59C13.94,13.41 13.5,13.12 13.17,12.75C13.26,12.58 13.35,12.42 13.44,12.28C13.95,12.2 14.42,11.95 14.8,11.58C15.17,11.22 15.42,10.75 15.5,10.25C15.56,9.75 15.45,9.22 15.16,8.73C15.32,8.62 15.5,8.53 15.69,8.47C15.87,8.41 16.06,8.38 16.25,8.38C16.55,8.38 16.85,8.47 17.13,8.62M12.5,14C13.33,14 14,14.67 14,15.5C14,16.33 13.33,17 12.5,17H11.5C10.67,17 10,16.33 10,15.5C10,14.67 10.67,14 11.5,14H12.5M8.5,15.25C8.5,15.25 8.5,15.25 8.5,15.25C8.5,15.94 8.75,16.58 9.25,17.06C9.25,17.06 9.25,17.06 9.25,17.06C9.74,17.54 10.38,17.81 11.06,17.81H11.08L11.06,17.81C11.05,17.81 11.05,17.81 11.06,17.81C11.06,17.81 11.06,17.81 11.06,17.81L11.08,17.81H12.92L12.94,17.81C12.94,17.81 12.95,17.81 12.94,17.81C12.94,17.81 12.94,17.81 12.94,17.81L12.92,17.81H12.94C13.62,17.81 14.26,17.54 14.75,17.06C14.75,17.06 14.75,17.06 14.75,17.06C15.25,16.58 15.5,15.94 15.5,15.25C15.5,15.25 15.5,15.25 15.5,15.25V14.75C15.5,14.75 15.5,14.75 15.5,14.75C15.1,14.31 14.53,14.05 13.92,14C13.92,14 13.92,14 13.92,14H10.08C10.08,14 10.08,14 10.08,14C9.47,14.05 8.9,14.31 8.5,14.75C8.5,14.75 8.5,14.75 8.5,14.75V15.25Z" />
        </svg>
      );
    default:
      return null;
  }
};

const StatusBadge = ({ status }: { status: Agent['status'] }) => {
  const variant = {
    Active: 'default',
    Inactive: 'destructive',
    Pending: 'secondary',
  }[status] as 'default' | 'destructive' | 'secondary';

  return <Badge variant={variant} className="capitalize">{status}</Badge>;
};

const CodeBlock = ({ text }: { text: string }) => {
    const { toast } = useToast();
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "Installation command copied to clipboard." });
    };

    return (
        <div className="relative font-mono text-sm p-3 bg-muted rounded-md">
            <pre className="whitespace-pre-wrap">{text}</pre>
            <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={handleCopy}
            >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy</span>
            </Button>
        </div>
    );
};


export default function AgentsPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [platformFilter, setPlatformFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const { toast } = useToast();

  const filteredAgents = React.useMemo(() => {
    return mockAgents.filter(agent => {
        const term = searchTerm.toLowerCase();
        const platformMatch = platformFilter === 'all' || agent.platform === platformFilter;
        const statusMatch = statusFilter === 'all' || agent.status === statusFilter;
        const searchMatch = agent.name.toLowerCase().includes(term) || agent.id.toLowerCase().includes(term);
        return platformMatch && statusMatch && searchMatch;
    });
  }, [searchTerm, platformFilter, statusFilter]);

  const handleDownload = (platform: string) => {
    toast({
        title: "Download Started",
        description: `Downloading agent for ${platform}...`
    })
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle className="font-headline">Agent Management</CardTitle>
                <CardDescription>Configure, deploy, and monitor your compliance agents.</CardDescription>
            </div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Deploy Agent
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Deploy New Agent</DialogTitle>
                        <DialogDescription>
                            Select a platform to download the agent and view installation instructions.
                        </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="windows" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="windows">Windows</TabsTrigger>
                            <TabsTrigger value="macos">macOS</TabsTrigger>
                            <TabsTrigger value="linux">Linux</TabsTrigger>
                        </TabsList>
                        <TabsContent value="windows">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Windows Agent</CardTitle>
                                    <CardDescription>Download the installer for Windows Server and Desktop.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Button onClick={() => handleDownload('Windows')} className="w-full">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Agent (.msi)
                                    </Button>
                                    <div className='space-y-2'>
                                        <h4 className="font-semibold">Installation Instructions</h4>
                                        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                                            <li>Download the <code>AuditAceAgent.msi</code> installer.</li>
                                            <li>Run the installer with administrator privileges.</li>
                                            <li>Follow the on-screen instructions to complete the installation.</li>
                                            <li>The agent will start automatically and register with the server.</li>
                                        </ol>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="macos">
                            <Card>
                                <CardHeader>
                                    <CardTitle>macOS Agent</CardTitle>
                                    <CardDescription>Download the installer for macOS.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Button onClick={() => handleDownload('macOS')} className="w-full">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Agent (.pkg)
                                    </Button>
                                     <div className='space-y-2'>
                                        <h4 className="font-semibold">Installation Instructions</h4>
                                        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                                            <li>Download the <code>AuditAceAgent.pkg</code> file.</li>
                                            <li>Open the installer package and follow the prompts.</li>
                                            <li>You may need to grant permissions in System Settings {'>'} Privacy & Security.</li>
                                            <li>The agent will launch upon successful installation.</li>
                                        </ol>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="linux">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Linux Agent</CardTitle>
                                    <CardDescription>Download the agent for Debian-based or RPM-based systems.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Button onClick={() => handleDownload('Linux (.deb)')} className="w-full">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download (.deb)
                                        </Button>
                                        <Button onClick={() => handleDownload('Linux (.rpm)')} className="w-full">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download (.rpm)
                                        </Button>
                                    </div>
                                    <div className='space-y-2'>
                                        <h4 className="font-semibold">Installation Instructions (Debian/Ubuntu)</h4>
                                        <CodeBlock text="sudo dpkg -i AuditAceAgent.deb" />
                                         <h4 className="font-semibold pt-2">Installation Instructions (CentOS/Fedora)</h4>
                                        <CodeBlock text="sudo rpm -i AuditAceAgent.rpm" />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
         <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by name or ID..."
                    className="pl-8 sm:w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by platform" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="windows">Windows</SelectItem>
                    <SelectItem value="macos">macOS</SelectItem>
                    <SelectItem value="linux">Linux</SelectItem>
                </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="border rounded-md">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                 {filteredAgents.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <Bot className="h-12 w-12" />
                                <p className="mt-4 font-medium">No agents found.</p>
                                <p className="text-sm mt-1">Deploy an agent to get started.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                        <TableCell>
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-sm text-muted-foreground font-mono">{agent.id}</div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <PlatformIcon platform={agent.platform} />
                                <span className="capitalize">{agent.platform}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <StatusBadge status={agent.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(agent.lastSync), { addSuffix: true })}
                        </TableCell>
                         <TableCell>
                            <Badge variant="outline">{agent.version}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem><Settings className="mr-2 h-4 w-4" />Configure</DropdownMenuItem>
                                    <DropdownMenuItem><Download className="mr-2 h-4 w-4" />Download</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}

    