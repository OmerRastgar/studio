import { v4 as uuidv4 } from 'uuid';
import { neo4jSyncQueue } from '../lib/queue';

export class GraphService {
    /**
     * Enqueues an event to link a Project to an Auditor in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async assignAuditor(projectId: string, auditorId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('assign_auditor', {
            eventId,
            payload: { projectId, auditorId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued assign_auditor event: ${eventId}`);
    }

    /**
     * Enqueues an event to link a User to a Manager in the Graph (User Hierarchy).
     * This is an async operation (Eventual Consistency).
     */
    static async assignManager(userId: string, managerId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('assign_manager', {
            eventId,
            payload: { userId, managerId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued assign_manager event: ${eventId}`);
    }

    /**
     * Enqueues an event to link a Project to a Reviewer in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async assignReviewer(projectId: string, reviewerId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('assign_reviewer', {
            eventId,
            payload: { projectId, reviewerId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued assign_reviewer event: ${eventId}`);
    }

    /**
     * Enqueues an event to link Evidence to a Control in the Graph (Evidence Chains).
     * This is an async operation (Eventual Consistency).
     */
    static async linkEvidenceToControl(evidenceId: string, controlId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('link_evidence_to_control', {
            eventId,
            payload: { evidenceId, controlId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued link_evidence_to_control event: ${eventId}`);
    }

    /**
     * Enqueues an event to link Evidence to an Uploader (User) with role in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async linkEvidenceUploader(evidenceId: string, userId: string, role: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('link_evidence_uploader', {
            eventId,
            payload: { evidenceId, userId, role },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued link_evidence_uploader event: ${eventId}`);
    }

    /**
     * Enqueues an event to link a Control to a Standard in the Graph (Control Logic).
     * This is an async operation (Eventual Consistency).
     */
    static async linkControlToStandard(controlId: string, standardId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('link_control_to_standard', {
            eventId,
            payload: { controlId, standardId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued link_control_to_standard event: ${eventId}`);
    }

    /**
     * Enqueues an event to link similar Controls in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async linkSimilarControls(controlId1: string, controlId2: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('link_similar_controls', {
            eventId,
            payload: { controlId1, controlId2 },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued link_similar_controls event: ${eventId}`);
    }

    /**
     * Enqueues an event to link an Auditor to a Project with a Request status in the Graph (Audit Requests).
     * This is an async operation (Eventual Consistency).
     */
    static async createAuditRequest(auditorId: string, projectId: string, status: string = 'open') {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('create_audit_request', {
            eventId,
            payload: { auditorId, projectId, status },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued create_audit_request event: ${eventId}`);
    }

    /**
     * Enqueues an event to link a Customer to a Manager with an Issue in the Graph (Issues/Blockers).
     * This is an async operation (Eventual Consistency).
     */
    static async reportIssue(customerId: string, managerId: string, issueDetails?: any) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('report_issue', {
            eventId,
            payload: { customerId, managerId, issueDetails },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued report_issue event: ${eventId}`);
    }

    /**
     * Enqueues an event to link a Compliance Role to a Customer in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async linkComplianceToCustomer(complianceId: string, customerId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('link_compliance_to_customer', {
            eventId,
            payload: { complianceId, customerId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued link_compliance_to_customer event: ${eventId}`);
    }

    /**
     * Enqueues an event to link a Control to a Tag in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async linkControlToTag(controlId: string, tagId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('link_control_to_tag', {
            eventId,
            payload: { controlId, tagId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued link_control_to_tag event: ${eventId}`);
    }

    /**
     * Enqueues an event to link Evidence to a Tag in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async linkEvidenceToTag(evidenceId: string, tagId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('link_evidence_to_tag', {
            eventId,
            payload: { evidenceId, tagId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued link_evidence_to_tag event: ${eventId}`);
    }

    /**
     * Enqueues an event to link a Control from one Standard to another Control from another Standard via a Tag in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async linkControlsViaTag(controlId1: string, controlId2: string, tagId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('link_controls_via_tag', {
            eventId,
            payload: { controlId1, controlId2, tagId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued link_controls_via_tag event: ${eventId}`);
    }

    /**
     * Enqueues an event to link Evidence to a Project in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async linkEvidenceToProject(evidenceId: string, projectId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('link_evidence_to_project', {
            eventId,
            payload: { evidenceId, projectId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued link_evidence_to_project event: ${eventId}`);
    }

    /**
     * Enqueues an event to link Evidence from one Project to Evidence for another Standard (of the same Customer) in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async linkEvidenceAcrossStandards(evidenceId1: string, evidenceId2: string, customerId: string, standardId: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('link_evidence_across_standards', {
            eventId,
            payload: { evidenceId1, evidenceId2, customerId, standardId },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued link_evidence_across_standards event: ${eventId}`);
    }

    /**
     * Updates a property on a node (Generic).
     * This is an async operation (Eventual Consistency).
     */
    static async updateNodeProperty(label: string, id: string, property: string, value: any) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('update_node_property', {
            eventId,
            payload: { label, id, property, value },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued update_node_property event: ${eventId}`);
    }

    /**
     * Enqueues an event to create a Standard (Framework) in the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async createStandard(id: string, name: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('standard_created', {
            eventId,
            payload: { id, name },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued standard_created event: ${eventId}`);
    }

    /**
     * Enqueues an event to delete a Standard (Framework) and its Controls from the Graph.
     * This is an async operation (Eventual Consistency).
     */
    static async deleteStandard(id: string) {
        const eventId = uuidv4();
        await neo4jSyncQueue.add('standard_deleted', {
            eventId,
            payload: { id },
            timestamp: new Date().toISOString()
        }, {
            jobId: eventId // Dedup ID
        });
        console.log(`[GraphService] Enqueued standard_deleted event: ${eventId}`);
    }
}
