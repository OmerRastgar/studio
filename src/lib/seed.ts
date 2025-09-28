// src/lib/seed.ts
import { db } from './firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { mockProjects, mockUsers, mockAgents, mockEvidence, mockAuditLogs } from './data';

export async function seedDatabase() {
  const batch = writeBatch(db);

  // Seed Projects
  const projectsCol = collection(db, 'projects');
  mockProjects.forEach(project => {
    const docRef = doc(projectsCol, project.id);
    batch.set(docRef, { ...project, createdAt: new Date() });
  });

  // Seed Users
  const usersCol = collection(db, 'users');
  mockUsers.forEach(user => {
    const docRef = doc(usersCol, user.email);
    batch.set(docRef, user);
  });

  // Seed Agents
  const agentsCol = collection(db, 'agents');
  mockAgents.forEach(agent => {
    const docRef = doc(agentsCol, agent.id);
    batch.set(docRef, agent);
  });

  // Seed Evidence
  const evidenceCol = collection(db, 'evidence');
  mockEvidence.forEach(evidence => {
    const docRef = doc(evidenceCol, evidence.id);
    batch.set(docRef, evidence);
  });

  // Seed Audit Logs
  const auditLogsCol = collection(db, 'auditLogs');
  mockAuditLogs.forEach(log => {
    const docRef = doc(auditLogsCol, log.id);
    batch.set(docRef, log);
  });

  try {
    await batch.commit();
    console.log('Database seeded successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { success: false, error };
  }
}

// To run this, you could expose it via an API route or run it from a script.
// Example of an API route in Next.js (e.g., /pages/api/seed.ts)
/*
import type { NextApiRequest, NextApiResponse } from 'next';
import { seedDatabase } from '@/lib/seed';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Basic protection
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Seeding is only allowed in development.' });
    }
    const result = await seedDatabase();
    if (result.success) {
      res.status(200).json({ message: 'Database seeded successfully!' });
    } else {
      res.status(500).json({ message: 'Failed to seed database.', error: result.error });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
*/
