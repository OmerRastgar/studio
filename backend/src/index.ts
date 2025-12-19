import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { register } from 'prom-client';
import { initTracing } from './lib/observability/tracing';
import { updateSystemMetrics } from './lib/observability/metrics';
import { initializeSocket } from './socket';

// Initialize tracing before anything else
if (process.env.NODE_ENV === 'production') {
    initTracing();
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Initialize Socket.IO
const io = initializeSocket(httpServer);

app.use(cors());
app.use(express.json());

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        await updateSystemMetrics();
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import healthRoutes from './routes/health';
import customerRoutes from './routes/customer';
import adminRoutes from './routes/admin';
import managerRoutes from './routes/manager';
import chatRoutes from './routes/chat';
import auditorRoutes from './routes/auditor';
import complianceRoutes from './routes/compliance';
import evidenceRoutes from './routes/evidence';
import uploadsRoutes from './routes/uploads';
import tagsRoutes from './routes/tags';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auditor', auditorRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/tags', tagsRoutes);
import systemRoutes from './routes/system';
console.log('[DEBUG] Registering /api/system routes');
app.use('/api/system', systemRoutes);
app.use('/api/uploads', uploadsRoutes);

httpServer.listen(PORT, () => {
    console.log(`Backend service running on port ${PORT}`);
    console.log(`Socket.IO ready on port ${PORT}`);
});
