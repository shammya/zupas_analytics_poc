from fastapi import APIRouter
from app.database import get_client

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    try:
        client = get_client()
        result = client.query("SELECT 1")
        return {"status": "ok", "clickhouse": "connected"}
    except Exception as e:
        return {"status": "error", "clickhouse": str(e)}
