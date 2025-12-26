"use client";

import { useAuth } from "@/components/auth/kratos-auth-provider";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PlayCircle, FileText, CheckCircle2, XCircle } from "lucide-react";
import { SecureViewer } from "@/components/evidence/viewer/SecureViewer";
import { cn } from "@/lib/utils";

interface Policy {
  id: string;
  fileName: string;
  fileUrl: string;
  objectKey: string;
  projectName: string;
  uploadedAt: string;
  reviewed: boolean;
  reviewedAt: string | null;
}

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
}

export default function LearningPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("policy-review");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPolicy, setViewingPolicy] = useState<Policy | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  useEffect(() => {
    if (token) {
      fetchPolicies();
      fetchVideos();
    }
  }, [token]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (viewingPolicy) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewingPolicy]);

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/learning/policies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setPolicies(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch policies", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/learning/training', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setVideos(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch videos", error);
    }
  };

  const toggleReviewed = async (policy: Policy, checked: boolean) => {
    // Optimistic update
    setPolicies(prev => prev.map(p =>
      p.id === policy.id ? { ...p, reviewed: checked, reviewedAt: checked ? new Date().toISOString() : null } : p
    ));

    try {
      const method = checked ? 'POST' : 'DELETE';
      await fetch(`/api/learning/policies/${policy.id}/review`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Failed to toggle review status", error);
      // Revert on error
      fetchPolicies();
    }
  };

  return (
    <div className="p-8 space-y-8 min-h-screen bg-background relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Center</h1>
          <p className="text-muted-foreground mt-1">Review policies and access training materials.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="policy-review" className="gap-2">
            <FileText className="w-4 h-4" />
            Policy Review
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-2">
            <PlayCircle className="w-4 h-4" />
            Training
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policy-review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Policies</CardTitle>
              <CardDescription>Review and acknowledge the following organization policies.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading policies...</div>
              ) : policies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No policies assigned for review.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Policy Name</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map(policy => (
                      <TableRow key={policy.id} className={cn(policy.reviewed && "bg-muted/30")}>
                        <TableCell>
                          <Checkbox
                            checked={policy.reviewed}
                            onCheckedChange={(checked) => toggleReviewed(policy, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            {policy.fileName}
                          </div>
                        </TableCell>
                        <TableCell>{policy.projectName}</TableCell>
                        <TableCell>
                          {policy.reviewed ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Reviewed
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending Review</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setViewingPolicy(policy)}>
                            View Document
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 flex items-center gap-3">
            <div className="bg-blue-600 rounded-full p-1">
              <PlayCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              These training videos are suggested using analytics from all customer data to provide the most relevant content for your organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <Card key={video.id} className="overflow-hidden flex flex-col">
                <div className="aspect-video relative bg-black">
                  <iframe
                    src={video.url}
                    title={video.title}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
                <CardHeader>
                  <CardTitle className="text-base line-clamp-1">{video.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{video.description}</p>
                  <Button className="w-full" variant="outline" onClick={() => setPlayingVideo(video)}>
                    Watch Video
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Secure Viewer Modal */}
      {viewingPolicy && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950 flex items-center justify-center m-0 p-0">
          <div className="w-full h-full bg-slate-950 flex flex-col">
            <SecureViewer
              evidenceId={viewingPolicy.id}
              objectKey={viewingPolicy.objectKey}
              filename={viewingPolicy.fileName}
              contentType="application/pdf" // Assuming policies are PDFs for now, or drive from extension
              token={token}
              onClose={() => setViewingPolicy(null)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-12">
          <div className="w-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl relative flex flex-col">
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
              <h3 className="font-medium text-lg truncate pr-4">{playingVideo.title}</h3>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" onClick={() => setPlayingVideo(null)}>
                <XCircle className="w-6 h-6" />
              </Button>
            </div>
            <div className="aspect-video w-full bg-black relative">
              <iframe
                src={`${playingVideo.url}?autoplay=1`}
                title={playingVideo.title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
            <div className="p-6 bg-slate-900 text-white">
              <p className="text-gray-300">{playingVideo.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
