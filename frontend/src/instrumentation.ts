export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.SKIP_OBSERVABILITY !== 'true') {
        try {
            // const { initTracing } = await import('./lib/observability/tracing');
            // initTracing();
            console.log('Tracing skipped');
        } catch (error) {
            console.error('Failed to initialize observability:', error);
            // Do not rethrow, allow app to start without tracing
        }
    }
}
