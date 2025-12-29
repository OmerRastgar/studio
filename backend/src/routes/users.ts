import express from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/jwt';
import { authenticate, requireRole } from '../middleware/auth';
import { kratosAdmin } from '../lib/kratos';
import { neo4jSyncQueue } from '../lib/queue';

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticate);
// Ensure only admin/manager can access
router.use(requireRole(['admin', 'manager']));

// GET /api/users - Get all users
router.get('/', async (req, res) => {
    try {
        const currentUser = (req as any).user;

        // 1. Fetch from Kratos (Source of Truth for Identity)
        const { data: identities } = await kratosAdmin.listIdentities();

        // 2. Fetch from Local DB (Source of Truth for Relations & Activity)
        const whereClause: any = {};

        // Manager Isolation: Only see users they manage or are linked to their customers
        if (currentUser.role === 'manager') {
            whereClause.OR = [
                { managerId: currentUser.userId },
                { linkedCustomer: { managerId: currentUser.userId } }
            ];
        }

        const localUsers = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                avatarUrl: true,
                lastActive: true,
                managerId: true,
                linkedCustomerId: true,
                linkedCustomer: {
                    select: { name: true }
                }
            }
        });

        // 3. Merge & Filter
        const userMap = new Map(localUsers.map(u => [u.id, u]));

        const mergedUsers = identities.map(identity => {
            const local = userMap.get(identity.id);
            const traits = identity.traits as any;

            // Enforce Manager Isolation
            // If current user is manager, they can ONLY see users present in their filtered local fetch
            if (currentUser.role === 'manager' && !local) {
                return null;
            }

            return {
                id: identity.id,
                name: typeof traits.name === 'string'
                    ? traits.name
                    : `${traits.name?.first || ''} ${traits.name?.last || ''}`.trim(),
                email: traits.email,
                role: traits.role, // Truth from Kratos
                status: identity.state === 'active' ? 'Active' : 'Inactive', // Truth from Kratos
                createdAt: identity.created_at, // Truth from Kratos
                avatarUrl: local?.avatarUrl || `https://picsum.photos/seed/${identity.id}/100/100`,
                lastActive: local?.lastActive?.toISOString() || null, // Truth from Local
                managerId: local?.managerId || null,
                linkedCustomerId: local?.linkedCustomerId || null,
                linkedCustomer: local?.linkedCustomer || null
            };
        }).filter(user => user !== null);

        // Sort by Created At desc (using Kratos timestamp)
        mergedUsers.sort((a, b) => {
            const timeA = new Date(a!.createdAt || 0).getTime();
            const timeB = new Date(b!.createdAt || 0).getTime();
            return timeB - timeA;
        });

        res.json({
            success: true,
            users: mergedUsers,
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
    try {
        console.log('[User Create Debug] Request:', { body: req.body, admin: (req as any).user?.userId });
        const { name, email, role } = req.body;
        const currentUser = (req as any).user;

        if (!name || !email || !role) {
            return res.status(400).json({ error: 'Name, email, and role are required' });
        }

        // Manager Restrictions & Admin Enforcements
        let managerId = null;
        let linkedCustomerId = null;

        if (currentUser.role === 'manager') {
            const allowedRoles = ['auditor', 'customer', 'compliance'];
            if (!allowedRoles.includes(role)) {
                return res.status(403).json({ error: 'Managers can only create Auditor, Customer, or Compliance users' });
            }
            managerId = currentUser.userId;

            // Compliance Constraint for Manager
            if (role === 'compliance') {
                if (!req.body.linkedCustomerId) {
                    return res.status(400).json({ error: 'Compliance users must be linked to a Customer' });
                }
                linkedCustomerId = req.body.linkedCustomerId;
            }
        } else if (currentUser.role === 'admin') {
            // Admin Enforcements
            if (role === 'auditor' || role === 'customer') {
                if (req.body.managerId) {
                    managerId = req.body.managerId;
                }
            }

            if (role === 'compliance') {
                if (!req.body.linkedCustomerId) {
                    return res.status(400).json({ error: 'Compliance users must be linked to a Customer' });
                }
                linkedCustomerId = req.body.linkedCustomerId;
            }
        }

        // 1. Check if user exists locally (quick fail)
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // 2. Create Identity in Kratos

        // Generate Random Password
        const generatedPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

        const { data: identity } = await kratosAdmin.createIdentity({
            createIdentityBody: {
                schema_id: 'default',
                state: 'active',
                traits: {
                    email,
                    name,
                    role
                },
                credentials: {
                    password: { config: { password: generatedPassword } }
                }
            }
        });

        // 3. Create Shadow User in Local DB
        const defaultPassword = await hashPassword(generatedPassword);

        const user = await prisma.user.create({
            data: {
                id: identity.id, // CRITICAL: Sync IDs
                name,
                email: email.toLowerCase(),
                role,
                password: defaultPassword,
                avatarUrl: `https://picsum.photos/seed/${name.replace(/\s+/g, '')}/100/100`,
                status: 'Active',
                managerId,
                linkedCustomerId,
                forcePasswordChange: true // NEW: Force change on first login
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                avatarUrl: true,
                lastActive: true,
                createdAt: true,
                managerId: true,
                linkedCustomerId: true
            },
        });

        // Audit Log
        const adminName = (req as any).user?.name || 'System Admin';

        await prisma.auditLog.create({
            data: {
                id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userName: adminName,
                action: 'User Created',
                details: `New user ${name} (${email}) created with role ${role}`,
                severity: 'Medium',
            },
        });

        // Sync to Neo4j
        await neo4jSyncQueue.add('user_created', {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            eventId: `EVT-${Date.now()}`
        });

        res.json({
            success: true,
            user: {
                ...user,
                lastActive: user.lastActive?.toISOString(),
                createdAt: user.createdAt.toISOString(),
            },
            generatedPassword // CRITICAL: Return THIS ONCE for the UI to show
        });
    } catch (error: any) {
        console.error('Create user error:', error);
        // Handle Kratos duplicates
        if (error.response?.status === 409) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
    try {
        console.log(`[User Update Debug] Starting update for ${req.params.id}`, { payload: req.body });
        const { name, role, status } = req.body;
        const userId = req.params.id;

        if (!name || !role) {
            return res.status(400).json({ error: 'Name and role are required' });
        }

        // 1. Fetch & Update Kratos Identity (Source of Truth)
        let identity;
        try {
            // Fetch current
            const { data } = await kratosAdmin.getIdentity({ id: userId });
            identity = data;
            console.log(`[User Update Debug] Fetched Kratos Identity:`, { id: identity.id, email: (identity.traits as any)?.email });

            // Prepare updates
            const currentTraits = identity.traits as any;
            const updatedTraits = {
                ...currentTraits,
                role: role,
            };

            if (name) {
                if (name) {
                    updatedTraits.name = name;
                }
            }

            // Perform Update
            // Note: We intentionally don't update 'state' here unless explicitly requested below, 
            // but we must provide it in the body.

            const updateBody = {
                schema_id: identity.schema_id,
                state: (identity.state as any) || 'active',
                traits: updatedTraits
            };

            if (status && (status === 'Active' || status === 'Inactive')) {
                updateBody.state = status === 'Active' ? 'active' : 'inactive';
            }

            const { data: updatedIdentity } = await kratosAdmin.updateIdentity({
                id: userId,
                updateIdentityBody: updateBody
            });

            // Update our reference for the local DB sync
            identity = updatedIdentity;

        } catch (error) {
            console.error('Kratos update failed:', error);
            if ((error as any).response?.status === 404) {
                return res.status(404).json({ error: 'User not found in identity provider' });
            }
            return res.status(500).json({ error: 'Failed to update identity provider' });
        }

        // 2. Pre-Sync Check: Resolve Email Conflicts (Legacy Data)
        // If a local user exists with this email but DIFFERENT ID, it's a legacy record.
        // We must remove it to allow the Kratos-linked record (Source of Truth) to be created.
        const userEmail = (identity.traits as any).email;
        if (userEmail) {
            const conflictUser = await prisma.user.findUnique({
                where: { email: userEmail.toLowerCase() },
            });

            if (conflictUser && conflictUser.id !== userId) {
                console.warn(`Resolving legacy user conflict for email ${userEmail}: Migrating legacy ID ${conflictUser.id} to Kratos ID ${userId}`);

                try {
                    // MIGRATION: Attempt to update the legacy user's ID to match Kratos ID.
                    // This preserves relationships (Projects, Findings, etc.) if FKs cascade.
                    await prisma.user.update({
                        where: { id: conflictUser.id },
                        data: {
                            id: userId,
                            // Verify verified status or other fields if needed? 
                            // For now just ID migration is key for linkage.
                        }
                    });
                } catch (migrationError) {
                    console.error("Failed to migrate legacy user ID (likely FK constraints). Archiving legacy user instead.", migrationError);

                    // Fallback: If we can't migrate ID, we must free up the email.
                    // Rename legacy user email so we can create the new one.
                    await prisma.user.update({
                        where: { id: conflictUser.id },
                        data: {
                            email: `${userEmail}.legacy.${Date.now()}`,
                            status: 'Inactive'
                        }
                    });
                    // This creates a "zombie" record but preserves data for manual recovery if needed.
                }
            }
        }

        // 3. Update/Create Local DB (Sync)
        const emailToSync = (identity.traits as any).email;
        if (!emailToSync) {
            throw new Error(`[User Update Debug] CRITICAL: No email found in Kratos identity traits for ${userId}. Cannot sync to local DB.`);
        }

        console.log(`[User Update Debug] Upserting local user:`, { id: userId, email: emailToSync });

        const updatedUser = await prisma.user.upsert({
            where: { id: userId },
            update: {
                name,
                role,
                status: status || undefined,
                managerId: req.body.managerId, // Allow Manager reassignment
            },
            create: {
                id: userId,
                name,
                email: (identity.traits as any).email,
                role,
                status: status || 'Active',
                password: await hashPassword('kratos_managed_user'),
                avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
                managerId: req.body.managerId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                avatarUrl: true,
                lastActive: true,
                createdAt: true,
            },
        });

        // Audit Log
        const adminName = (req as any).user?.name || 'System Admin';

        await prisma.auditLog.create({
            data: {
                id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userName: adminName,
                action: 'User Updated',
                details: `User ${updatedUser.name} (${updatedUser.email}) updated - Role: ${role}${status ? `, Status: ${status}` : ''}`,
                severity: 'Medium',
            },
        });

        // Sync to Neo4j
        await neo4jSyncQueue.add('user_updated', {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            eventId: `EVT-${Date.now()}`
        });

        res.json({
            success: true,
            user: {
                ...updatedUser,
                lastActive: updatedUser.lastActive?.toISOString(),
                createdAt: updatedUser.createdAt.toISOString(),
            },
        });
    } catch (error: any) {
        console.error('[User Update Debug] Update user error:', error);

        if (error.code === 'P2002') {
            console.error('[User Update Debug] Prisma Unique Constraint Violation:', error.meta);
            return res.status(409).json({
                error: 'Database conflict: Email already synced to another user ID.',
                details: error.meta
            });
        }

        res.status(500).json({
            error: 'Failed to update user',
            details: (error instanceof Error) ? error.message : String(error)
        });
    }
});

// POST /api/users/:id/reset-password - Reset user password (Admin/Manager)
router.post('/:id/reset-password', async (req, res) => {
    try {
        const userId = req.params.id;
        const currentUser = (req as any).user;

        console.log(`[User Reset Password] Request by ${currentUser.name} for target ${userId}`);

        // 1. Fetch Target User (to verify permissions)
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, managerId: true, email: true, name: true }
        });

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Permission Check
        if (currentUser.role === 'manager') {
            // Managers can only reset their own Auditors/Customers
            if (targetUser.managerId !== currentUser.userId) {
                return res.status(403).json({ error: 'Unauthorized to reset password for this user' });
            }
            if (!['auditor', 'customer'].includes(targetUser.role)) {
                return res.status(403).json({ error: 'Managers can only reset Auditor or Customer passwords' });
            }
        }
        // Admins can reset anyone (implicit)

        // 3. Generate Random Password
        const generatedPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

        // 4. Update Kratos Credentials
        try {
            await kratosAdmin.updateIdentity({
                id: userId,
                updateIdentityBody: {
                    schema_id: 'default',
                    state: 'active',
                    traits: {
                        email: targetUser.email,
                        name: targetUser.name,
                        role: targetUser.role
                    },
                    credentials: {
                        password: { config: { password: generatedPassword } }
                    }
                }
            });
        } catch (kratosErr: any) {
            console.error('[User Reset Password] Kratos update failed:', kratosErr);
            return res.status(500).json({ error: 'Failed to update identity provider credentials' });
        }

        // 5. Update Local DB (Hash + Force Change Flag)
        const hashedPassword = await hashPassword(generatedPassword);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                forcePasswordChange: true
            }
        });

        // 6. Audit Log
        await prisma.auditLog.create({
            data: {
                id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userName: currentUser.name || 'System Admin',
                action: 'Password Reset',
                details: `Password reset for user ${targetUser.name} (${targetUser.email})`,
                severity: 'High',
            },
        });

        console.log(`[User Reset Password] Success for ${targetUser.email}`);

        res.json({
            success: true,
            generatedPassword // Return to admin to share with user
        });

    } catch (error) {
        console.error('[User Reset Password] Error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
    try {
        console.log(`[User Delete Debug] Deleting user ${req.params.id}`);
        const userId = req.params.id;

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (existingUser.role === 'admin') {
            const adminCount = await prisma.user.count({
                where: { role: 'admin' },
            });

            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin user' });
            }
        }

        // 1. Delete from Kratos (Best Effort/Sync)
        try {
            await kratosAdmin.deleteIdentity({ id: userId });
        } catch (kratosErr: any) {
            if (kratosErr.response?.status !== 404) {
                // If deletion fails (and not just "not found"), we should probably block deletion?
                // Or allow "force delete"? For now, lets warn but proceed to clean up local state if implicit.
                // Actually safer to block to prevent zombie identities.
                console.error('Kratos delete failed:', kratosErr);
                return res.status(500).json({ error: 'Failed to delete identity provider record' });
            }
        }

        // 2. Delete from Local DB
        await prisma.user.delete({
            where: { id: userId },
        });

        const adminName = (req as any).user?.name || 'System Admin';

        await prisma.auditLog.create({
            data: {
                id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userName: adminName,
                action: 'User Deleted',
                details: `User ${existingUser.name} (${existingUser.email}) was deleted`,
                severity: 'High',
            },
        });

        // Sync to Neo4j
        await neo4jSyncQueue.add('user_deleted', {
            id: userId,
            eventId: `EVT-${Date.now()}`
        });

        res.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
