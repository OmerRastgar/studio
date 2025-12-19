// import { Queue } from 'bullmq';

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Lazy load BullMQ to handle ESM/CommonJS interop issues in this project setup
let queueInstance: any = null;

// Bypass TypeScript compiler converting import() to require()
const dynamicImport = new Function('specifier', 'return import(specifier)');

async function getQueue() {
    if (queueInstance) return queueInstance;

    const host = process.env.REDIS_HOST || 'redis';
    const port = parseInt(process.env.REDIS_PORT || '6379');

    try {
        const { Queue } = await dynamicImport('bullmq');
        queueInstance = new Queue('neo4j-sync', {
            connection: {
                host,
                port,
            },
            defaultJobOptions: {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true,
            },
        });
        return queueInstance;
    } catch (err) {
        console.error('Failed to load bullmq:', err);
        throw err;
    }
}

export const neo4jSyncQueue = {
    add: async (name: string, data: any, opts?: any) => {
        const q = await getQueue();
        return q.add(name, data, opts);
    }
};
