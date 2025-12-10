import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from app.config import settings
from app.core.logger import logger

from temporalio.contrib.opentelemetry import TracingInterceptor

class TemporalManager:
    def __init__(self):
        self.client = None
        self.worker = None
        self._worker_task = None

    async def connect(self):
        if settings.AIRGAPPED:
            logger.info("Airgapped mode: Skipping Temporal connection")
            return

        try:
            self.client = await Client.connect(
                settings.TEMPORAL_HOST, 
                namespace=settings.TEMPORAL_NAMESPACE,
                interceptors=[TracingInterceptor()]
            )
            logger.info(f"Connected to Temporal at {settings.TEMPORAL_HOST}")
        except Exception as e:
            logger.error(f"Failed to connect to Temporal: {e}")
            # We don't raise here to allow the service to run in standalone mode if Temporal is down
            # or if we are just testing the HTTP endpoint.

    async def start_worker(self, activities: list, workflows: list = []):
        if not self.client or settings.AIRGAPPED:
            return

        self.worker = Worker(
            self.client,
            task_queue=settings.TASK_QUEUE,
            activities=activities,
            workflows=workflows,
        )
        
        # Run worker in background
        self._worker_task = asyncio.create_task(self.worker.run())
        logger.info(f"Started Temporal worker on queue {settings.TASK_QUEUE}")

    async def stop_worker(self):
        if self.worker:
            await self.worker.shutdown()
            if self._worker_task:
                await self._worker_task

temporal_manager = TemporalManager()
