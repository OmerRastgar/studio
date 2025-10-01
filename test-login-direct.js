// Test login API directly (bypassing Kong)
const fetch = require('node-fetch')

async function testLogin() {
  try {
    console.log('🔍 Testing login API directly...')
    
    // Test direct connection to app (port 3000)
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@auditace.com',
        password: 'admin123'
      })
    })
    
    console.log(`📊 Response status: ${response.status}`)
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers))
    
    const responseText = await response.text()
    console.log(`📊 Response body:`, responseText)
    
    if (response.ok) {
      const data = JSON.parse(responseText)
      console.log('✅ Login successful!')
      console.log('🎫 JWT Token:', data.token?.substring(0, 50) + '...')
    } else {
      console.log('❌ Login failed')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testLogin()