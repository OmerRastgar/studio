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

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@example.com' },
    update: { password },
    create: {
      email: 'auditor@example.com',
      name: 'Auditor User',
      password,
      role: 'auditor',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
    },
  });

  // Create Auditor profile
  await prisma.auditor.upsert({
    where: { userId: auditor.id },
    update: {},
    create: {
      id: auditor.id, // Use same ID as user
      userId: auditor.id,
      experience: '5 years',
      certifications: ['CISA', 'CISSP'],
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: { password },
    create: {
      email: 'customer@example.com',
      name: 'Customer User',
      password,
      role: 'customer',
      status: 'Active',
      avatarUrl: 'https://github.com/shadcn.png',
    },
  });

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

  console.log({ admin, auditor, customer, manager });
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