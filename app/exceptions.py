import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)


class AnalyticsServiceError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code


class InvalidTimeframeError(AnalyticsServiceError):
    def __init__(self, timeframe: str):
        super().__init__(f"Invalid timeframe: {timeframe}", status_code=400)


class InvalidMetricError(AnalyticsServiceError):
    def __init__(self, metric: str):
        super().__init__(f"Invalid metric: {metric}", status_code=400)


def register_exception_handlers(app: FastAPI):

    @app.exception_handler(AnalyticsServiceError)
    async def analytics_error_handler(request: Request, exc: AnalyticsServiceError):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.message})

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        log.error(f"Unhandled error: {exc}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Internal server error"})
