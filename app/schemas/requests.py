from typing import Literal
from fastapi import Query

# Valid values for query params
Timeframe = Literal["today", "yesterday", "this_week", "last_week", "this_month", "last_month"]
Metric = Literal["created", "delivered", "failed", "incomplete", "deleted"]
ChartTab = Literal["pickup", "delivery", "drive", "ontime"]


def parse_company_ids(company_ids: str = Query(..., description="Comma-separated company IDs")) -> list[int]:
    try:
        return [int(x.strip()) for x in company_ids.split(",") if x.strip()]
    except ValueError:
        raise ValueError("company_ids must be comma-separated integers")
