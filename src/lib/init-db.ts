import { testConnection } from './db';

// Initialize database connection on app startup
export async function initializeDatabase() {
  console.log('Initializing database connection...');
  
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Database connection established successfully');
      return true;
    } else {
      console.error('❌ Failed to establish database connection');
      return false;
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return false;
  }
}

// Call this function when the app starts
if (typeof window === 'undefined') {
  // Only run on server side
  initializeDatabase().catch(console.error);
}