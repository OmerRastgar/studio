import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  const password = await hashPassword('password123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { password },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password,
      role: 'admin',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
    },
  });

  // Simple demo users matching login screen
  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: { password },
    create: {
      email: 'manager@example.com',
      name: 'Manager User',
      password,
      role: 'manager',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@example.com' },
    update: { password, managerId: manager.id },
    create: {
      email: 'auditor@example.com',
      name: 'Auditor User',
      password,
      role: 'auditor',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
      managerId: manager.id,
    },
  });

  await prisma.auditor.upsert({
    where: { userId: auditor.id },
    update: {},
    create: {
      id: auditor.id,
      userId: auditor.id,
      experience: '5 years',
      certifications: ['CISA', 'CISSP'],
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: { password, managerId: manager.id },
    create: {
      email: 'customer@example.com',
      name: 'Customer User',
      password,
      role: 'customer',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
      managerId: manager.id,
    },
  });


  // Manager 1 Hierarchy
  const manager1 = await prisma.user.upsert({
    where: { email: 'manager1@example.com' },
    update: { password },
    create: {
      email: 'manager1@example.com',
      name: 'Manager One',
      password,
      role: 'manager',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
    },
  });

  const auditor1 = await prisma.user.upsert({
    where: { email: 'auditor1@example.com' },
    update: { password, managerId: manager1.id },
    create: {
      email: 'auditor1@example.com',
      name: 'Auditor One (Under Mgr 1)',
      password,
      role: 'auditor',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
      managerId: manager1.id,
    },
  });

  await prisma.auditor.upsert({
    where: { userId: auditor1.id },
    update: {},
    create: {
      id: auditor1.id,
      userId: auditor1.id,
      experience: '5 years',
      certifications: ['CISA'],
    },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: 'customer1@example.com' },
    update: { password, managerId: manager1.id },
    create: {
      email: 'customer1@example.com',
      name: 'Customer One (Under Mgr 1)',
      password,
      role: 'customer',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
      managerId: manager1.id,
    },
  });

  // Manager 2 Hierarchy (Isolated)
  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@example.com' },
    update: { password },
    create: {
      email: 'manager2@example.com',
      name: 'Manager Two',
      password,
      role: 'manager',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
    },
  });

  const auditor2 = await prisma.user.upsert({
    where: { email: 'auditor2@example.com' },
    update: { password, managerId: manager2.id },
    create: {
      email: 'auditor2@example.com',
      name: 'Auditor Two (Under Mgr 2)',
      password,
      role: 'auditor',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
      managerId: manager2.id,
    },
  });

  await prisma.auditor.upsert({
    where: { userId: auditor2.id },
    update: {},
    create: {
      id: auditor2.id,
      userId: auditor2.id,
      experience: '3 years',
      certifications: ['CISSP'],
    },
  });

  console.log({ admin, manager1, auditor1, customer1, manager2, auditor2 });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });