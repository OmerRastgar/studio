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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { mockEvidence } from '@/lib/data';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Eye } from 'lucide-react';
import { useState } from 'react';

export default function EvidencePage() {
    const [evidenceList, setEvidenceList] = useState(mockEvidence);

    const handleDelete = (id: string) => {
        setEvidenceList(evidenceList.filter(e => e.id !== id));
    };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Evidence Locker</CardTitle>
          <CardDescription>Upload, tag, and manage evidence files.</CardDescription>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Upload Evidence
        </Button>
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
            {evidenceList.map((evidence) => (
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
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(evidence.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
