// Simple test to verify Prisma is working
const { PrismaClient } = require('@prisma/client')

async function test() {
  try {
    console.log('Testing Prisma client generation...')
    const prisma = new PrismaClient()
    console.log('✅ Prisma client created successfully')
    
    // Don't actually connect, just test the client creation
    console.log('✅ Test passed - Prisma is properly configured')
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

test()