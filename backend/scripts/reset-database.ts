import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
    console.log('🗑️  Starting database reset...');

    try {
        // Delete all data in order (respecting foreign key constraints)
        console.log('Deleting all data...');

        // Delete child records first
        await prisma.evidenceItem.deleteMany({});
        console.log('  ✓ Deleted EvidenceItems');

        await prisma.message.deleteMany({});
        console.log('  ✓ Deleted Messages');

        await prisma.conversationParticipant.deleteMany({});
        console.log('  ✓ Deleted ConversationParticipants');

        await prisma.conversation.deleteMany({});
        console.log('  ✓ Deleted Conversations');

        await prisma.projectTimeLog.deleteMany({});
        console.log('  ✓ Deleted ProjectTimeLogs');

        await prisma.projectIssue.deleteMany({});
        console.log('  ✓ Deleted ProjectIssues');

        await prisma.evidence.deleteMany({});
        console.log('  ✓ Deleted Evidence');

        await prisma.projectControl.deleteMany({});
        console.log('  ✓ Deleted ProjectControls');

        await prisma.auditRequest.deleteMany({});
        console.log('  ✓ Deleted AuditRequests');

        await prisma.auditEvent.deleteMany({});
        console.log('  ✓ Deleted AuditEvents');

        await prisma.complianceActivity.deleteMany({});
        console.log('  ✓ Deleted ComplianceActivities');

        await prisma.userCourse.deleteMany({});
        console.log('  ✓ Deleted UserCourses');

        await prisma.projectShare.deleteMany({});
        console.log('  ✓ Deleted ProjectShares');

        await prisma.project.deleteMany({});
        console.log('  ✓ Deleted Projects');

        await prisma.control.deleteMany({});
        console.log('  ✓ Deleted Controls');

        await prisma.framework.deleteMany({});
        console.log('  ✓ Deleted Frameworks');

        await prisma.tag.deleteMany({});
        console.log('  ✓ Deleted Tags');

        await prisma.course.deleteMany({});
        console.log('  ✓ Deleted Courses');

        await prisma.agent.deleteMany({});
        console.log('  ✓ Deleted Agents');

        await prisma.auditor.deleteMany({});
        console.log('  ✓ Deleted Auditors');

        await prisma.auditLog.deleteMany({});
        console.log('  ✓ Deleted AuditLogs');

        await prisma.user.deleteMany({});
        console.log('  ✓ Deleted Users');

        console.log('\n✅ Database reset complete!');
        console.log('\nRun the seed script to create fresh data:');
        console.log('  docker exec studio-backend npx tsx prisma/seed.ts');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
