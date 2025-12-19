import { Worker } from 'bullmq';
import { graphProcessor } from './processors/graph.processor';

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

console.log('Starting Worker Service...');

const worker = new Worker('neo4j-sync', graphProcessor, {
    connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
    },
});

worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} has failed with ${err.message}`);
});

console.log('Worker listening for jobs on neo4j-sync queue.');
