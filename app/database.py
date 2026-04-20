import queue
import logging
import clickhouse_connect
from clickhouse_connect.driver import Client
from app.config import settings

log = logging.getLogger(__name__)

_pool: queue.Queue[Client] = queue.Queue()
_connect_kwargs: dict = {}
POOL_SIZE = 5


def connect():
    global _connect_kwargs
    _connect_kwargs = dict(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
        database=settings.clickhouse_database,
        secure=True,
        connect_timeout=30,
        send_receive_timeout=120,
    )
    for _ in range(POOL_SIZE):
        _pool.put(clickhouse_connect.get_client(**_connect_kwargs))
    log.info("ClickHouse pool ready (%s connections) → %s", POOL_SIZE, settings.clickhouse_host)


def get_client():
    """Yield a client from the pool; return it when the request finishes."""
    client = _pool.get(block=True, timeout=10)
    try:
        yield client
    finally:
        _pool.put(client)


def disconnect():
    while not _pool.empty():
        try:
            _pool.get_nowait().close()
        except queue.Empty:
            break
    log.info("ClickHouse pool closed")
