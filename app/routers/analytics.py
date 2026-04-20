from fastapi import APIRouter, Depends, Query
from clickhouse_connect.driver import Client

from app.database import get_client
from app.schemas.requests import Timeframe, Metric, ChartTab, parse_company_ids
from app.schemas.responses import (
    SummaryResponse, BreakdownResponse, DrilldownResponse, OntimeChartsResponse,
    CompaniesResponse,
)
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/companies", response_model=CompaniesResponse)
def companies(
    client: Client = Depends(get_client),
    company_ids: list[int] = Depends(parse_company_ids),
):
    return analytics_service.get_companies(client, company_ids)


@router.get("/summary", response_model=SummaryResponse)
def summary(
    client: Client = Depends(get_client),
    company_ids: list[int] = Depends(parse_company_ids),
    timeframe: Timeframe = Query(...),
):
    return analytics_service.get_summary(client, company_ids, timeframe)


@router.get("/breakdown", response_model=BreakdownResponse)
def breakdown(
    client: Client = Depends(get_client),
    company_ids: list[int] = Depends(parse_company_ids),
    timeframe: Timeframe = Query(...),
):
    return analytics_service.get_breakdown(client, company_ids, timeframe)


@router.get("/drilldown", response_model=DrilldownResponse)
def drilldown(
    client: Client = Depends(get_client),
    company_id: int = Query(...),
    metric: Metric = Query(...),
    timeframe: Timeframe = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    return analytics_service.get_drilldown(
        client, company_id, metric, timeframe, page, page_size
    )


@router.get("/ontime-charts", response_model=OntimeChartsResponse)
def ontime_charts(
    client: Client = Depends(get_client),
    company_ids: list[int] = Depends(parse_company_ids),
    timeframe: Timeframe = Query(...),
    tab: ChartTab | None = Query(None),
):
    return analytics_service.get_ontime_charts(client, company_ids, timeframe, tab)
