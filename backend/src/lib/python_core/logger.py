import sys
import json
import asyncio
import logging
import structlog
from typing import Any, Dict
import aiohttp
from app.config import settings

# Configure standard logging to stderr as fallback
logging.basicConfig(
    format="%(message)s",
    stream=sys.stderr,
    level=settings.LOG_LEVEL,
)

class FluentBitLogger:
    def __init__(self):
        self.queue = asyncio.Queue()
        self.url = f"http://{settings.FLUENT_BIT_HOST}:{settings.FLUENT_BIT_PORT}/{settings.FLUENT_BIT_TAG}"
        self.batch_size = 10
        self.flush_interval = 5  # seconds
        self._worker_task = None

    async def start(self):
        self._worker_task = asyncio.create_task(self._worker())

    async def stop(self):
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass

    async def log(self, event_dict: Dict[str, Any]):
        if settings.AIRGAPPED:
            return
        try:
            self.queue.put_nowait(event_dict)
        except asyncio.QueueFull:
            # Drop log or fallback to stderr if critical
            sys.stderr.write(f"Log queue full: {json.dumps(event_dict)}\n")

    async def _worker(self):
        batch = []
        last_flush = asyncio.get_event_loop().time()

        while True:
            try:
                # Wait for log or timeout
                try:
                    timeout = max(0.1, self.flush_interval - (asyncio.get_event_loop().time() - last_flush))
                    log_entry = await asyncio.wait_for(self.queue.get(), timeout=timeout)
                    batch.append(log_entry)
                except asyncio.TimeoutError:
                    pass

                current_time = asyncio.get_event_loop().time()
                if len(batch) >= self.batch_size or (batch and current_time - last_flush >= self.flush_interval):
                    await self._flush(batch)
                    batch = []
                    last_flush = current_time
            except asyncio.CancelledError:
                if batch:
                    await self._flush(batch)
                break
            except Exception as e:
                sys.stderr.write(f"Error in log worker: {e}\n")
                await asyncio.sleep(1)

    async def _flush(self, batch: list):
        try:
            # Send as JSON array for Fluent Bit HTTP input
            payload = json.dumps(batch)
            async with aiohttp.ClientSession() as session:
                async with session.post(self.url, data=payload, headers={"Content-Type": "application/json"}) as resp:
                    if resp.status >= 400:
                        sys.stderr.write(f"Failed to send logs to Fluent Bit: {resp.status}\n")
        except Exception as e:
            sys.stderr.write(f"Fluent Bit connection failed: {e}\n")
            # Fallback: print to stderr
            for record in batch:
                sys.stderr.write(json.dumps(record) + "\n")

fluent_logger = FluentBitLogger()

def add_structlog_context(logger, method_name, event_dict):
    # Add static context if needed
    event_dict["service"] = settings.SERVICE_NAME
    event_dict["worker_type"] = settings.WORKER_TYPE
    return event_dict

def fluent_processor(logger, method_name, event_dict):
    # Fire and forget to fluent bit queue
    # We operate on a copy or just send the dict
    # Note: This assumes we are running in the same event loop
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(fluent_logger.log(event_dict.copy()))
    except RuntimeError:
        # No running event loop (e.g. during import or sync init)
        # Fallback to stderr is already handled by PrintLoggerFactory
        pass
    except Exception as e:
        # Just print to stderr if scheduling fails, don't crash
        sys.stderr.write(f"Failed to schedule log task: {e}\n")
    return event_dict

from opentelemetry import trace

def add_open_telemetry_context(logger, method_name, event_dict):
    span = trace.get_current_span()
    if span != trace.INVALID_SPAN:
        ctx = span.get_span_context()
        event_dict["trace_id"] = trace.format_trace_id(ctx.trace_id)
        event_dict["span_id"] = trace.format_span_id(ctx.span_id)
    return event_dict

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        add_structlog_context,
        add_open_telemetry_context, # Add OTel context
        fluent_processor,
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.PrintLoggerFactory(sys.stderr),
)

logger = structlog.get_logger()

# Helper to start/stop logging background task
async def start_logging():
    await fluent_logger.start()

async def stop_logging():
    await fluent_logger.stop()
