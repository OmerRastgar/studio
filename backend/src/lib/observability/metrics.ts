import { collectDefaultMetrics, Counter, Histogram, Gauge, register } from 'prom-client';
import os from 'os';

// Initialize default metrics
collectDefaultMetrics({ prefix: 'studio_backend_' });

// Define metrics
export const REQUESTS_TOTAL = new Counter({
    name: 'studio_backend_requests_total',
    help: 'Total number of requests processed',
    labelNames: ['method', 'endpoint', 'status']
});

export const PROCESSING_DURATION = new Histogram({
    name: 'studio_backend_processing_duration_seconds',
    help: 'Time taken to process requests',
    labelNames: ['method', 'endpoint'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const ACTIVE_REQUESTS = new Gauge({
    name: 'studio_backend_active_requests',
    help: 'Number of requests currently being processed'
});

export const SYSTEM_CPU_USAGE = new Gauge({
    name: 'studio_backend_system_cpu_usage_percent',
    help: 'System CPU usage percentage'
});

export const SYSTEM_RAM_USAGE = new Gauge({
    name: 'studio_backend_system_ram_usage_bytes',
    help: 'System RAM usage in bytes'
});

// Helper to update system metrics
export function updateSystemMetrics() {
    // Update RAM usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    SYSTEM_RAM_USAGE.set(usedMem);

    // Update CPU usage (simple approximation)
    const cpus = os.cpus();
    const idle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const total = cpus.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);
    const usage = 1 - idle / total;
    SYSTEM_CPU_USAGE.set(usage * 100);
}
