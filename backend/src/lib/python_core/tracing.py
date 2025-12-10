import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME

from app.config import settings

def setup_tracing():
    if settings.AIRGAPPED:
        return

    resource = Resource.create({
        SERVICE_NAME: settings.SERVICE_NAME,
        "worker.type": settings.WORKER_TYPE,
    })

    provider = TracerProvider(resource=resource)
    
    # OTLP Exporter (HTTP)
    # Default endpoint for HTTP is http://localhost:4318/v1/traces
    # We default to http://otel-collector:4318/v1/traces
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4318/v1/traces")
    
    exporter = OTLPSpanExporter(endpoint=endpoint)
    
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)
    
    trace.set_tracer_provider(provider)
