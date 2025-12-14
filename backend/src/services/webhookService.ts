import fetch from 'node-fetch';

const N8N_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL || 'http://studio-n8n:5678/webhook';

// Use specific endpoints or a single router endpoint depending on n8n setup
// User requested: "send data to an endpoint for n8n for each of the catagories"
const ENDPOINTS = {
    PROJECT_APPROVED: `${N8N_BASE_URL}/project-approved`,
    HOURS_LOGGED: `${N8N_BASE_URL}/hours-logged`,
    MEETING_CREATED: `${N8N_BASE_URL}/meeting-created`
};

interface ProjectApprovedPayload {
    projectId: string;
    projectName: string;
    customerName: string;
    description?: string;
    framework: string;
    auditorName: string;
    auditorEmail: string;
    reviewerName: string;
    reviewerEmail: string;
    dueDate?: string;
}

interface HoursLoggedPayload {
    projectId: string;
    projectName: string;
    framework: string;
    userId: string;
    userName: string;
    userRole: string; // 'auditor' | 'reviewer'
    hoursToAdd: number;
    activityType: 'audit' | 'review' | 'meeting';
    description?: string;
}

interface MeetingCreatedPayload {
    projectId: string;
    projectName: string;
    framework: string;
    auditorName: string;
    meetingDurationMinutes: number;
    meetingDate: string;
    meetingTitle: string;
}

export const webhookService = {
    async sendProjectApproved(data: ProjectApprovedPayload) {
        try {
            console.log(`Sending Project Approved webhook for ${data.projectName}`);
            const response = await fetch(ENDPOINTS.PROJECT_APPROVED, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'project_approved',
                    timestamp: new Date().toISOString(),
                    ...data
                })
            });

            if (!response.ok) {
                console.error(`Failed to send project webhook: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error sending project webhook:', error);
        }
    },

    async sendHoursLogged(data: HoursLoggedPayload) {
        try {
            console.log(`Sending Hours Logged webhook for ${data.userName} on ${data.projectName} (${data.hoursToAdd}h)`);
            const response = await fetch(ENDPOINTS.HOURS_LOGGED, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'hours_logged',
                    timestamp: new Date().toISOString(),
                    ...data
                })
            });

            if (!response.ok) {
                console.error(`Failed to send hours webhook: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error sending hours webhook:', error);
        }
    },

    async sendMeetingCreated(data: MeetingCreatedPayload) {
        try {
            console.log(`Sending Meeting Created webhook for ${data.projectName}`);
            const response = await fetch(ENDPOINTS.MEETING_CREATED, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'meeting_created',
                    timestamp: new Date().toISOString(),
                    ...data
                })
            });

            if (!response.ok) {
                console.error(`Failed to send meeting webhook: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error sending meeting webhook:', error);
        }
    }
};
