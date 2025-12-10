import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const TEMPO_URL = process.env.TEMPO_URL || 'http://tempo:4318/v1/traces';

export function initTracing() {
    const sdk = new NodeSDK({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: 'studio-backend',
        }),
        spanProcessor: new SimpleSpanProcessor(
            new OTLPTraceExporter({
                url: TEMPO_URL,
            })
        ),
        instrumentations: [getNodeAutoInstrumentations()],
    });

    try {
        sdk.start();
        console.log('Tracing initialized for studio-backend');
    } catch (error) {
        console.error('Error initializing tracing:', error);
    }

    process.on('SIGTERM', () => {
        sdk.shutdown()
            .then(() => console.log('Tracing terminated'))
            .catch((error) => console.error('Error terminating tracing', error));
    });
}
