"use client";

import { useAuth } from "@/app/auth-provider";
import { useEffect, useState } from "react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface AuditEvent {
    id: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    customer: { name: string } | null;
    project: { name: string } | null;
}

export function AuditCalendar() {
    const { token } = useAuth();
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        projectId: 'none'
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            try {
                const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '';
                const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

                // Fetch events
                const eventsRes = await fetch(`${apiUrl}/api/auditor/events`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Fetch projects for dropdown
                const projectsRes = await fetch(`${apiUrl}/api/auditor/projects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (eventsRes.ok) {
                    const data = await eventsRes.json();
                    setEvents(data.data);
                }

                if (projectsRes.ok) {
                    const data = await projectsRes.json();
                    setProjects(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch calendar data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const handleDateClick = (arg: any) => {
        setNewEvent({
            title: '',
            description: '',
            startTime: arg.dateStr, // simple date string like '2023-12-10'
            endTime: arg.dateStr,
            projectId: 'none'
        });
        setIsDialogOpen(true);
    };

    const handleSaveEvent = async () => {
        if (!token || !newEvent.title || !newEvent.startTime) return;

        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '';
            const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

            await fetch(`${apiUrl}/api/auditor/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newEvent.title,
                    description: newEvent.description,
                    startTime: new Date(newEvent.startTime).toISOString(),
                    endTime: newEvent.endTime ? new Date(newEvent.endTime).toISOString() : new Date(newEvent.startTime).toISOString(),
                    projectId: newEvent.projectId === 'none' ? null : newEvent.projectId
                })
            });

            // Refresh events
            const res = await fetch(`${apiUrl}/api/auditor/events`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEvents(data.data);
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error('Failed to save event:', error);
        }
    };

    const calendarEvents = events.map(event => {
        // Determine color based on event type
        let color = '#3b82f6'; // default blue
        if (event.id.startsWith('start-')) color = '#22c55e'; // green for start
        if (event.id.startsWith('due-')) color = '#ef4444'; // red for due

        return {
            id: event.id,
            title: `${event.title} ${event.customer ? `- ${event.customer.name}` : ''}`,
            start: event.startTime,
            end: event.endTime,
            backgroundColor: color,
            borderColor: color,
            extendedProps: {
                description: event.description,
                project: event.project?.name
            }
        };
    });

    if (loading) return <div>Loading calendar...</div>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Audit Schedule</CardTitle>
                <Button onClick={() => {
                    setNewEvent({
                        title: '',
                        description: '',
                        startTime: new Date().toISOString().split('T')[0],
                        endTime: new Date().toISOString().split('T')[0],
                        projectId: 'none'
                    });
                    setIsDialogOpen(true);
                }}>Add Event</Button>
            </CardHeader>
            <CardContent>
                <div className="h-[600px]">
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek'
                        }}
                        events={calendarEvents}
                        height="100%"
                        dateClick={handleDateClick}
                        eventDidMount={(info) => {
                            // Add tooltip for hover visibility
                            info.el.title = `${info.event.title}\n${info.event.extendedProps.description || ''}${info.event.extendedProps.project ? '\nProject: ' + info.event.extendedProps.project : ''}`;
                        }}
                        eventContent={(arg) => {
                            return (
                                <div className="p-1">
                                    <div className="text-xs font-semibold" style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.2' }}>
                                        {arg.event.title}
                                    </div>
                                </div>
                            );
                        }}
                        eventClick={(info) => {
                            const props = info.event.extendedProps as { description?: string, project?: string };
                            // Simple alert for now, could be a details dialog
                            alert(`Event: ${info.event.title}\nProject: ${props.project || 'N/A'}\nDescription: ${props.description || 'N/A'}`);
                        }}
                    />
                </div>
                {/* Custom CSS for wrapping - Injected here for simplicity or could be in global.css */}
                <style jsx global>{`
                    .fc-event-title {
                        white-space: normal !important;
                    }
                `}</style>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Calendar Event</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="title" className="text-right">
                                    Title
                                </Label>
                                <Input
                                    id="title"
                                    value={newEvent.title}
                                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="project" className="text-right">
                                    Project
                                </Label>
                                <Select
                                    value={newEvent.projectId}
                                    onValueChange={(val) => setNewEvent({ ...newEvent, projectId: val })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a project (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="start" className="text-right">
                                    Start Date
                                </Label>
                                <Input
                                    id="start"
                                    type="date"
                                    value={newEvent.startTime.split('T')[0]} // Handle ISO strings or simple date strings
                                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="end" className="text-right">
                                    End Date
                                </Label>
                                <Input
                                    id="end"
                                    type="date"
                                    value={newEvent.endTime.split('T')[0]}
                                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="desc" className="text-right">
                                    Description
                                </Label>
                                <Textarea
                                    id="desc"
                                    value={newEvent.description}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveEvent}>Save Event</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
