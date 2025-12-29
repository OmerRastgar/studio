import { Job } from 'bullmq';
import neo4j from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';

let neo4jUser = process.env.NEO4J_USER || 'neo4j';
let neo4jPassword = process.env.NEO4J_PASSWORD || '';

// Fallback: Check NEO4J_AUTH if password is missing
if (!neo4jPassword && process.env.NEO4J_AUTH) {
  const [user, pass] = process.env.NEO4J_AUTH.split('/');
  if (user && pass) {
    neo4jUser = user;
    neo4jPassword = pass;
  }
}

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(neo4jUser, neo4jPassword));

export const graphProcessor = async (job: Job) => {
  const { eventId, payload } = job.data;
  const session = driver.session();

  try {
    // 1. Idempotency Check: Have we processed this event?
    const checkResult = await session.run(
      `MATCH (e:Event {id: $eventId}) RETURN count(e) > 0 AS exists`,
      { eventId }
    );
    const exists = checkResult.records[0].get('exists');

    if (exists) {
      console.log(`Event ${eventId} already processed. Skipping.`);
      return;
    }

    // 2. Process based on job name
    const tx = session.beginTransaction();
    try {
      // HANDLE ALL EVENT TYPES
      if (job.name === 'assign_auditor') {
        await tx.run(`
                  MERGE (u:User {id: $auditorId})
                  MERGE (p:Project {id: $projectId})
                  MERGE (u)-[r:AUDITED_BY]->(p)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
                `, { auditorId: payload.auditorId, projectId: payload.projectId, eventId });
      } else if (job.name === 'assign_manager') {
        await tx.run(`
                  MERGE (u:User {id: $userId})
                  MERGE (m:User {id: $managerId})
                  MERGE (u)-[r:MANAGED_BY]->(m)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
                `, { userId: payload.userId, managerId: payload.managerId, eventId });
      } else if (job.name === 'assign_reviewer') {
        await tx.run(`
                  MERGE (u:User {id: $reviewerId})
                  MERGE (p:Project {id: $projectId})
                  MERGE (u)-[r:REVIEWS]->(p)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
                `, { reviewerId: payload.reviewerId, projectId: payload.projectId, eventId });
      } else if (job.name === 'link_evidence_to_control') {
        await tx.run(`
          MERGE (e:Evidence {id: $evidenceId})
          MERGE (c:Control {id: $controlId})
          MERGE (e)-[r:PROVES]->(c)
          ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
          SET r.updatedAt = datetime()
        `, { evidenceId: payload.evidenceId, controlId: payload.controlId, eventId });
      } else if (job.name === 'link_evidence_uploader') {
        await tx.run(`
                  MERGE (u:User {id: $userId})
                  MERGE (e:Evidence {id: $evidenceId})
                  MERGE (u)-[r:UPLOADED]->(e)
                  ON CREATE SET r.createdAt = datetime(), r.role = $role, r.eventId = $eventId
                  SET r.updatedAt = datetime(), r.role = $role
                `, { userId: payload.userId, evidenceId: payload.evidenceId, role: payload.role, eventId });
      } else if (job.name === 'link_control_to_standard') {
        await tx.run(`
                  MERGE (c:Control {id: $controlId})
                  MERGE (s:Standard {id: $standardId})
                  MERGE (c)-[r:BELONGS_TO]->(s)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
                `, { controlId: payload.controlId, standardId: payload.standardId, eventId });
      } else if (job.name === 'link_similar_controls') {
        await tx.run(`
                  MERGE (c1:Control {id: $controlId1})
                  MERGE (c2:Control {id: $controlId2})
                  MERGE (c1)-[r:SIMILAR_TO]->(c2)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
                `, { controlId1: payload.controlId1, controlId2: payload.controlId2, eventId });
      } else if (job.name === 'create_audit_request') {
        await tx.run(`
                  MERGE (u:User {id: $auditorId})
                  MERGE (p:Project {id: $projectId})
                  MERGE (u)-[r:REQUESTED]->(p)
                  ON CREATE SET r.createdAt = datetime(), r.status = $status, r.eventId = $eventId
                  SET r.updatedAt = datetime(), r.status = $status
                `, { auditorId: payload.auditorId, projectId: payload.projectId, status: payload.status, eventId });
      } else if (job.name === 'report_issue') {
        await tx.run(`
                  MERGE (c:User {id: $customerId})
                  MERGE (m:User {id: $managerId})
                  MERGE (c)-[r:HAS_ISSUE]->(m)
                  ON CREATE SET r.createdAt = datetime(), r.details = $details, r.eventId = $eventId
                  SET r.updatedAt = datetime(), r.details = $details
                `, { customerId: payload.customerId, managerId: payload.managerId, details: JSON.stringify(payload.issueDetails), eventId });
      } else if (job.name === 'link_compliance_to_customer') {
        await tx.run(`
                  MERGE (comp:User {id: $complianceId})
                  MERGE (cust:User {id: $customerId})
                  MERGE (comp)-[r:OVERSEES]->(cust)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
                `, { complianceId: payload.complianceId, customerId: payload.customerId, eventId });
      } else if (job.name === 'link_control_to_tag') {
        await tx.run(`
                  MERGE (c:Control {id: $controlId})
                  MERGE (t:Tag {id: $tagId})
                  MERGE (c)-[r:HAS_TAG]->(t)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
                `, { controlId: payload.controlId, tagId: payload.tagId, eventId });
      } else if (job.name === 'link_evidence_to_tag') {
        await tx.run(`
                  MERGE (e:Evidence {id: $evidenceId})
                  MERGE (t:Tag {id: $tagId})
                  MERGE (e)-[r:HAS_TAG]->(t)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
                `, { evidenceId: payload.evidenceId, tagId: payload.tagId, eventId });
      } else if (job.name === 'link_controls_via_tag') {
        await tx.run(`
                  MERGE (c1:Control {id: $controlId1})
                  MERGE (c2:Control {id: $controlId2})
                  MERGE (c1)-[r:RELATED_VIA {tagId: $tagId}]->(c2)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
               `, { controlId1: payload.controlId1, controlId2: payload.controlId2, tagId: payload.tagId, eventId });
      } else if (job.name === 'link_evidence_across_standards') {
        await tx.run(`
                  MERGE (e1:Evidence {id: $evidenceId1})
                  MERGE (e2:Evidence {id: $evidenceId2})
                  MERGE (e1)-[r:RELATES_TO {standardId: $standardId}]->(e2)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
               `, { evidenceId1: payload.evidenceId1, evidenceId2: payload.evidenceId2, standardId: payload.standardId, eventId });
      } else if (job.name === 'link_evidence_to_project') {
        await tx.run(`
                  MERGE (e:Evidence {id: $evidenceId})
                  MERGE (p:Project {id: $projectId})
                  MERGE (e)-[r:BELONGS_TO]->(p)
                  ON CREATE SET r.createdAt = datetime(), r.eventId = $eventId
                  SET r.updatedAt = datetime()
               `, { evidenceId: payload.evidenceId, projectId: payload.projectId, eventId });
      } else if (job.name === 'user_created') {
        await tx.run(`
                  MERGE (u:User {id: $id})
                  ON CREATE SET u.email = $email, u.name = $name, u.role = $role, u.createdAt = datetime(), u.eventId = $eventId
                  ON MATCH SET u.email = $email, u.name = $name, u.role = $role, u.updatedAt = datetime(), u.eventId = $eventId
               `, { id: payload.id, email: payload.email, name: payload.name, role: payload.role, eventId });
      } else if (job.name === 'user_updated') {
        await tx.run(`
                  MERGE (u:User {id: $id})
                  SET u.email = $email, u.name = $name, u.role = $role, u.updatedAt = datetime(), u.eventId = $eventId
               `, { id: payload.id, email: payload.email, name: payload.name, role: payload.role || null, eventId });
      } else if (job.name === 'user_deleted') {
        await tx.run(`
                  MATCH (u:User {id: $id})
                  DETACH DELETE u
               `, { id: payload.id });
      } else if (job.name === 'update_node_property') {
        const { label, id, property, value } = payload;
        // Construct query safely with dynamic property lookup not being purely dynamic but parameter usage
        // Cypher doesn't allow dynamic property keys in SET directly easily without APOC, but we can assume safe property names from trusted backend.
        // Or simpler: handle specific known properties or use a generic approach with string concatenation (careful of injection if property is user input, here it is dev controlled).
        if (['fileName', 'code', 'title', 'name'].includes(property)) {
          await tx.run(`
                MATCH (n:${label} {id: $id})
                SET n.${property} = $value
                SET n.updatedAt = datetime()
            `, { id, value });
        }
      }

      // MARK EVENT AS PROCESSED
      await tx.run(`
        CREATE (e:Event {id: $eventId, timestamp: datetime()})
      `, { eventId });

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }

  } finally {
    await session.close();
  }
};

// Cleanup driver on app exit (optional/handled by container stop)
process.on('SIGINT', () => driver.close());
