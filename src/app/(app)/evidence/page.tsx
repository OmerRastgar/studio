'use client';

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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { mockEvidence, mockProjects } from '@/lib/data';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Eye, FolderArchive } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function EvidencePage() {
    const [evidenceList, setEvidenceList] = useState(mockEvidence);
    const [selectedProject, setSelectedProject] = useState(mockProjects[0].id);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

    const filteredEvidence = useMemo(() => {
        return evidenceList.filter(e => e.projectId === selectedProject);
    }, [evidenceList, selectedProject]);
    
    const selectedProjectName = useMemo(() => {
        return mockProjects.find(p => p.id === selectedProject)?.name;
    }, [selectedProject]);

    const handleDelete = (id: string) => {
        setEvidenceList(evidenceList.filter(e => e.id !== id));
        setItemToDelete(null);
    };

    const handleDeleteAll = () => {
        setEvidenceList(evidenceList.filter(e => e.projectId !== selectedProject));
        setIsDeleteAllOpen(false);
    };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="font-headline">Evidence Locker</CardTitle>
          <CardDescription>Upload, tag, and manage evidence files for your projects.</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
           <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {mockProjects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className='w-full sm:w-auto'>
                <PlusCircle className="mr-2 h-4 w-4" />
                Upload Evidence
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="hidden md:table-cell">Uploaded At</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvidence.map((evidence) => (
              <TableRow key={evidence.id}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt={evidence.name}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={evidence.previewUrl}
                    width="64"
                    data-ai-hint={evidence.aiHint}
                  />
                </TableCell>
                <TableCell className="font-medium">{evidence.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {evidence.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {format(new Date(evidence.uploadedAt), 'PPP')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Preview</DropdownMenuItem>
                      <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete(evidence.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
         {filteredEvidence.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
                <FolderArchive className="mx-auto h-12 w-12" />
                <h3 className="mt-2 text-sm font-medium">No evidence found for this project.</h3>
                <p className="mt-1 text-sm">Get started by uploading some evidence.</p>
            </div>
        )}
        {filteredEvidence.length > 0 && (
          <div className='flex justify-end pt-6'>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" onClick={() => setIsDeleteAllOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Evidence for {selectedProjectName}
                </Button>
            </AlertDialogTrigger>
          </div>
        )}
      </CardContent>
    </Card>

    <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this piece of evidence.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDelete && handleDelete(itemToDelete)}>
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
     <AlertDialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Delete all evidence for {selectedProjectName}?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all evidence for this project.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
                Yes, delete all
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
