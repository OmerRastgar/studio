import time
import psutil
import asyncio
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from app.config import settings

# Metrics Definitions
# Metrics Definitions
REQUESTS_TOTAL = Counter(
    "worker_requests_total", 
    "Total number of requests processed", 
    ["status", "worker_type", "endpoint"]
)
PROCESSING_DURATION = Histogram(
    "worker_processing_duration_seconds", 
    "Time spent processing requests", 
    ["worker_type", "endpoint"]
)
ACTIVE_REQUESTS = Gauge(
    "worker_active_requests",
    "Number of requests currently being processed",
    ["worker_type", "endpoint"]
)
SYSTEM_CPU_USAGE = Gauge("system_cpu_usage_percent", "System CPU usage percentage")
SYSTEM_RAM_USAGE = Gauge("system_ram_usage_percent", "System RAM usage percentage")
SYSTEM_TEMP = Gauge("system_temperature_celsius", "System temperature (if available)")

class MetricsManager:
    def __init__(self):
        self._monitor_task = None

    async def start_system_monitoring(self):
        self._monitor_task = asyncio.create_task(self._monitor_system())

    async def stop_system_monitoring(self):
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass

    async def _monitor_system(self):
        while True:
            try:
                SYSTEM_CPU_USAGE.set(psutil.cpu_percent(interval=None))
                SYSTEM_RAM_USAGE.set(psutil.virtual_memory().percent)
                
                # Temperature might not be available on all systems/containers
                try:
                    temps = psutil.sensors_temperatures()
                    if temps:
                        # Just take the first available temp for simplicity
                        for name, entries in temps.items():
                            if entries:
                                SYSTEM_TEMP.set(entries[0].current)
                                break
                except Exception:
                    pass # Ignore if sensors not supported

                await asyncio.sleep(10)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error monitoring system metrics: {e}")
                await asyncio.sleep(10)

metrics_manager = MetricsManager()

def get_metrics():
    return generate_latest(), CONTENT_TYPE_LATEST
