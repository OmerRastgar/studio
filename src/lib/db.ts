// Database connection utilities
// This file is only loaded at runtime, not during build

let Pool: any;
let PoolClient: any;

// Database connection configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://audituser:auditpass@localhost:5432/auditdb',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

async function initPg() {
  if (!Pool) {
    try {
      const pg = await import('pg');
      Pool = pg.Pool;
      PoolClient = pg.PoolClient;
    } catch (error) {
      console.error('Failed to import pg module:', error);
      throw error;
    }
  }
}

// Create a connection pool
let pool: any = null;

export async function getPool() {
  await initPg();
  if (!pool) {
    pool = new Pool(dbConfig);
    
    // Handle pool errors
    pool.on('error', (err: any) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  
  return pool;
}

// Helper function to execute queries
export async function query(text: string, params?: any[]): Promise<any> {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function for transactions
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = await getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connected successfully:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}