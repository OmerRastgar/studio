// Simple test to check database connection and user table
const { PrismaClient } = require('@prisma/client')

async function testDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://audituser:auditpass@localhost:5432/auditdb'
      }
    }
  })

  try {
    console.log('🔍 Testing database connection...')
    
    // Test connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Check if users table exists and has data
    const userCount = await prisma.user.count()
    console.log(`📊 Found ${userCount} users in database`)
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true
        }
      })
      console.log('👥 Users in database:')
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ${user.role} - ${user.status}`)
      })
    } else {
      console.log('⚠️  No users found in database')
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    
    if (error.code === 'P2021') {
      console.log('💡 The table `User` does not exist. Run migrations first.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()