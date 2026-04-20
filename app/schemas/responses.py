from pydantic import BaseModel


class CompanyItem(BaseModel):
    company_id: int
    company_name: str = ""


class CompaniesResponse(BaseModel):
    companies: list[CompanyItem]


class CompanySummary(BaseModel):
    company_id: int
    total_created: int = 0
    total_delivered: int = 0
    delivered_by_driver: int = 0
    delivered_by_dispatcher: int = 0
    total_failed: int = 0
    total_incomplete: int = 0
    total_deleted: int = 0
    ontime_percentage: float = 0.0
    avg_drive_time_minutes: float = 0.0
    avg_delivery_time_minutes: float = 0.0


class SummaryResponse(BaseModel):
    companies: list[CompanySummary]


class BreakdownRow(BaseModel):
    company_id: int
    company_name: str = ""
    total_created: int = 0
    total_delivered: int = 0
    delivered_by_driver: int = 0
    delivered_by_dispatcher: int = 0
    total_failed: int = 0
    total_incomplete: int = 0
    total_deleted: int = 0
    ontime_percentage: float = 0.0
    avg_drive_time_minutes: float = 0.0
    avg_delivery_time_minutes: float = 0.0


class BreakdownResponse(BaseModel):
    rows: list[BreakdownRow]


class DrilldownOrder(BaseModel):
    order_number: str
    customer_name: str = ""
    customer_formatted_address: str = ""
    placement_time: str
    promised_delivery_time: str | None = None
    driver_name: str = ""
    order_status: str = ""
    total_cost: float = 0.0
    delivery_time: str | None = None
    delivery_delta_minutes: int = 0
    completed_by: str = ""
    assigned_time: str | None = None
    failed_delivery_time: str | None = None
    deleted_at: str | None = None
    deleted_by: str = ""
    deleted_by_role: str = ""
    waiting_minutes: int = 0


class DrilldownStats(BaseModel):
    total_count: int = 0
    # created
    total_delivered: int = 0
    total_failed: int = 0
    total_incomplete: int = 0
    # delivered
    delivered_by_driver: int = 0
    delivered_by_dispatcher: int = 0
    ontime_percentage: float = 0.0
    # failed
    fail_rate: float = 0.0
    # incomplete
    avg_waiting_minutes: int = 0
    critical_count: int = 0
    # deleted
    deletion_rate: float = 0.0


class DrilldownResponse(BaseModel):
    metric: str
    stats: DrilldownStats
    page: int
    page_size: int
    total_pages: int
    orders: list[DrilldownOrder]


class BucketEntry(BaseModel):
    bucket: str
    count: int = 0
    percentage: float = 0.0
    cumulative_percentage: float = 0.0


class ChartData(BaseModel):
    chart_type: str
    total_orders: int = 0
    buckets: list[BucketEntry]


class OntimeChartsResponse(BaseModel):
    charts: list[ChartData]
