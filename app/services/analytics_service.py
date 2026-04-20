import logging
import math
from datetime import date, datetime, timedelta
from clickhouse_connect.driver import Client

from app.exceptions import InvalidTimeframeError, InvalidMetricError
from app.schemas.responses import (
    CompanySummary, SummaryResponse, BreakdownRow, BreakdownResponse,
    DrilldownOrder, DrilldownStats, DrilldownResponse,
    BucketEntry, ChartData, OntimeChartsResponse,
)

log = logging.getLogger(__name__)

TABLE = "orders_flat"


# ── COMPANIES ─────────────────────────────────────────────────────────────────


def get_companies(client: Client, company_ids: list[int]):
    from app.schemas.responses import CompanyItem, CompaniesResponse
    query = f"""
        SELECT company_id, any(restaurant_name) AS company_name
        FROM {TABLE}
        WHERE company_id IN %(company_ids)s
        GROUP BY company_id
        ORDER BY company_id
    """
    result = client.query(query, parameters={"company_ids": company_ids})
    companies = [
        CompanyItem(company_id=r[0], company_name=r[1])
        for r in result.result_rows
    ]
    return CompaniesResponse(companies=companies)

# ── TIMEFRAME RESOLUTION ─────────────────────────────────────────────────────


def resolve_timeframe(timeframe: str) -> tuple[date, date]:
    """Convert timeframe string to (start_date, end_date) inclusive."""
    today = date.today()

    if timeframe == "today":
        return today, today
    elif timeframe == "yesterday":
        return today - timedelta(days=1), today - timedelta(days=1)
    elif timeframe == "this_week":
        monday = today - timedelta(days=today.weekday())
        return monday, today
    elif timeframe == "last_week":
        monday = today - timedelta(days=today.weekday() + 7)
        sunday = monday + timedelta(days=6)
        return monday, sunday
    elif timeframe == "this_month":
        return today.replace(day=1), today
    elif timeframe == "last_month":
        first_this_month = today.replace(day=1)
        last_day_prev = first_this_month - timedelta(days=1)
        return last_day_prev.replace(day=1), last_day_prev
    else:
        raise InvalidTimeframeError(timeframe)


def _where_clause(company_ids: list[int], start: date, end: date) -> tuple[str, dict]:
    """Build the common WHERE clause and parameters."""
    return (
        "WHERE company_id IN %(company_ids)s "
        "AND toDate(placement_time) >= %(start)s "
        "AND toDate(placement_time) <= %(end)s",
        {"company_ids": company_ids, "start": start, "end": end},
    )


# ── SUMMARY ──────────────────────────────────────────────────────────────────


def get_summary(client: Client, company_ids: list[int], timeframe: str) -> SummaryResponse:
    start, end = resolve_timeframe(timeframe)
    where, params = _where_clause(company_ids, start, end)

    query = f"""
        SELECT
            company_id,
            count()                                                         AS total_created,
            countIf(order_lifecycle_status = 'delivered')                    AS total_delivered,
            countIf(order_lifecycle_status = 'delivered' AND completed_by = 'driver')    AS delivered_by_driver,
            countIf(order_lifecycle_status = 'delivered' AND completed_by = 'dispatcher') AS delivered_by_dispatcher,
            countIf(order_lifecycle_status = 'failed')                      AS total_failed,
            countIf(order_lifecycle_status = 'incomplete')                   AS total_incomplete,
            countIf(order_lifecycle_status = 'deleted')                      AS total_deleted,
            if(countIf(order_lifecycle_status = 'delivered') > 0,
               round(countIf(is_ontime = 1) * 100.0 / countIf(order_lifecycle_status = 'delivered'), 2),
               0) AS ontime_percentage,
            if(countIf(drive_time_minutes > 0) > 0,
               round(avgIf(drive_time_minutes, drive_time_minutes > 0), 2),
               0) AS avg_drive_time_minutes,
            if(countIf(delivery_delta_minutes > 0) > 0,
               round(avgIf(delivery_delta_minutes, delivery_delta_minutes > 0), 2),
               0) AS avg_delivery_time_minutes
        FROM {TABLE}
        {where}
        GROUP BY company_id
        ORDER BY company_id
    """

    log.info(f"summary | companies={company_ids} timeframe={timeframe}")
    result = client.query(query, parameters=params)

    companies = [
        CompanySummary(
            company_id=row[0],
            total_created=row[1],
            total_delivered=row[2],
            delivered_by_driver=row[3],
            delivered_by_dispatcher=row[4],
            total_failed=row[5],
            total_incomplete=row[6],
            total_deleted=row[7],
            ontime_percentage=float(row[8]),
            avg_drive_time_minutes=float(row[9]),
            avg_delivery_time_minutes=float(row[10]),
        )
        for row in result.result_rows
    ]

    return SummaryResponse(companies=companies)


# ── BREAKDOWN ────────────────────────────────────────────────────────────────


def get_breakdown(client: Client, company_ids: list[int], timeframe: str) -> BreakdownResponse:
    start, end = resolve_timeframe(timeframe)
    where, params = _where_clause(company_ids, start, end)

    query = f"""
        SELECT
            company_id,
            any(restaurant_name)                                             AS company_name,
            count()                                                          AS total_created,
            countIf(order_lifecycle_status = 'delivered')                     AS total_delivered,
            countIf(order_lifecycle_status = 'delivered' AND completed_by = 'driver')     AS delivered_by_driver,
            countIf(order_lifecycle_status = 'delivered' AND completed_by = 'dispatcher') AS delivered_by_dispatcher,
            countIf(order_lifecycle_status = 'failed')                       AS total_failed,
            countIf(order_lifecycle_status = 'incomplete')                    AS total_incomplete,
            countIf(order_lifecycle_status = 'deleted')                       AS total_deleted,
            if(countIf(order_lifecycle_status = 'delivered') > 0,
               round(countIf(is_ontime = 1) * 100.0 / countIf(order_lifecycle_status = 'delivered'), 2),
               0) AS ontime_percentage,
            if(countIf(drive_time_minutes > 0) > 0,
               round(avgIf(drive_time_minutes, drive_time_minutes > 0), 2),
               0) AS avg_drive_time_minutes,
            if(countIf(delivery_delta_minutes > 0) > 0,
               round(avgIf(delivery_delta_minutes, delivery_delta_minutes > 0), 2),
               0) AS avg_delivery_time_minutes
        FROM {TABLE}
        {where}
        GROUP BY company_id
        ORDER BY company_id
    """

    log.info(f"breakdown | companies={company_ids} timeframe={timeframe}")
    result = client.query(query, parameters=params)

    rows = [
        BreakdownRow(
            company_id=r[0], company_name=r[1],
            total_created=r[2], total_delivered=r[3],
            delivered_by_driver=r[4], delivered_by_dispatcher=r[5],
            total_failed=r[6], total_incomplete=r[7], total_deleted=r[8],
            ontime_percentage=float(r[9]),
            avg_drive_time_minutes=float(r[10]),
            avg_delivery_time_minutes=float(r[11]),
        )
        for r in result.result_rows
    ]

    return BreakdownResponse(rows=rows)


# ── DRILLDOWN ────────────────────────────────────────────────────────────────

METRIC_FILTERS = {
    "created":    "1 = 1",
    "delivered":  "order_lifecycle_status = 'delivered'",
    "failed":     "order_lifecycle_status = 'failed'",
    "incomplete": "order_lifecycle_status = 'incomplete'",
    "deleted":    "order_lifecycle_status = 'deleted'",
}

# ── Stats queries per metric (each returns a DrilldownStats) ──

STATS_QUERIES = {
    "created": """
        SELECT
            count()                                          AS total_count,
            countIf(order_lifecycle_status = 'delivered')     AS total_delivered,
            countIf(order_lifecycle_status = 'failed')        AS total_failed,
            countIf(order_lifecycle_status = 'incomplete')    AS total_incomplete
        FROM {table} {where}
    """,
    "delivered": """
        SELECT
            count()                                          AS total_count,
            countIf(completed_by = 'driver')                  AS delivered_by_driver,
            countIf(completed_by = 'dispatcher')              AS delivered_by_dispatcher,
            if(count() > 0,
               round(countIf(is_ontime = 1) * 100.0 / count(), 2),
               0)                                            AS ontime_percentage
        FROM {table} {where} AND order_lifecycle_status = 'delivered'
    """,
    "failed": """
        SELECT
            countIf(order_lifecycle_status = 'failed')        AS total_count,
            if(count() > 0,
               round(countIf(order_lifecycle_status = 'failed') * 100.0 / count(), 2),
               0)                                            AS fail_rate
        FROM {table} {where}
    """,
    "incomplete": """
        SELECT
            countIf(order_lifecycle_status = 'incomplete')    AS total_count,
            if(countIf(order_lifecycle_status = 'incomplete') > 0,
               toInt32(round(avgIf(
                   dateDiff('minute', placement_time, now()),
                   order_lifecycle_status = 'incomplete'
               ))),
               0)                                            AS avg_waiting_minutes,
            countIf(order_lifecycle_status = 'incomplete'
                    AND dateDiff('minute', placement_time, now()) > 180) AS critical_count
        FROM {table} {where}
    """,
    "deleted": """
        SELECT
            countIf(order_lifecycle_status = 'deleted')       AS total_count,
            if(count() > 0,
               round(countIf(order_lifecycle_status = 'deleted') * 100.0 / count(), 2),
               0)                                            AS deletion_rate
        FROM {table} {where}
    """,
}


def _build_stats(metric: str, row) -> DrilldownStats:
    """Map a stats query result row to DrilldownStats based on metric type."""
    if metric == "created":
        return DrilldownStats(
            total_count=row[0], total_delivered=row[1],
            total_failed=row[2], total_incomplete=row[3],
        )
    elif metric == "delivered":
        return DrilldownStats(
            total_count=row[0], delivered_by_driver=row[1],
            delivered_by_dispatcher=row[2], ontime_percentage=float(row[3]),
        )
    elif metric == "failed":
        return DrilldownStats(total_count=row[0], fail_rate=float(row[1]))
    elif metric == "incomplete":
        return DrilldownStats(
            total_count=row[0], avg_waiting_minutes=row[1], critical_count=row[2],
        )
    elif metric == "deleted":
        return DrilldownStats(total_count=row[0], deletion_rate=float(row[1]))
    return DrilldownStats(total_count=row[0])


def get_drilldown(
    client: Client,
    company_id: int,
    metric: str,
    timeframe: str,
    page: int,
    page_size: int,
) -> DrilldownResponse:
    if metric not in METRIC_FILTERS:
        raise InvalidMetricError(metric)

    start, end = resolve_timeframe(timeframe)
    metric_filter = METRIC_FILTERS[metric]
    offset = (page - 1) * page_size

    where, params = "WHERE company_id = %(company_id)s " \
                    "AND toDate(placement_time) >= %(start)s " \
                    "AND toDate(placement_time) <= %(end)s", \
                    {"company_id": company_id, "start": start, "end": end}

    # ── Stats ──
    stats_sql = STATS_QUERIES[metric].format(table=TABLE, where=where)
    stats_row = client.query(stats_sql, parameters=params).result_rows[0]
    stats = _build_stats(metric, stats_row)

    # ── Orders ──
    data_query = f"""
        SELECT
            order_number,
            customer_name,
            customer_formatted_address,
            toString(placement_time),
            if(isNotNull(promised_delivery_time), toString(assumeNotNull(promised_delivery_time)), ''),
            driver_name,
            order_status,
            total_cost,
            if(isNotNull(delivery_time), toString(assumeNotNull(delivery_time)), ''),
            delivery_delta_minutes,
            completed_by,
            if(isNotNull(assigned_time), toString(assumeNotNull(assigned_time)), ''),
            if(isNotNull(failed_delivery_time), toString(assumeNotNull(failed_delivery_time)), ''),
            if(isNotNull(deleted_at), toString(assumeNotNull(deleted_at)), ''),
            deleted_by,
            deleted_by_role,
            if(order_lifecycle_status = 'incomplete',
               toInt32(dateDiff('minute', placement_time, now())),
               0) AS waiting_minutes
        FROM {TABLE}
        {where}
        AND {metric_filter}
        ORDER BY placement_time DESC
        LIMIT {page_size} OFFSET {offset}
    """

    log.info(f"drilldown | company={company_id} metric={metric} timeframe={timeframe} page={page}")
    result = client.query(data_query, parameters=params)

    orders = [
        DrilldownOrder(
            order_number=r[0],
            customer_name=r[1],
            customer_formatted_address=r[2],
            placement_time=r[3],
            promised_delivery_time=r[4] or None,
            driver_name=r[5],
            order_status=r[6],
            total_cost=float(r[7]),
            delivery_time=r[8] or None,
            delivery_delta_minutes=r[9],
            completed_by=r[10],
            assigned_time=r[11] or None,
            failed_delivery_time=r[12] or None,
            deleted_at=r[13] or None,
            deleted_by=r[14],
            deleted_by_role=r[15],
            waiting_minutes=r[16],
        )
        for r in result.result_rows
    ]

    return DrilldownResponse(
        metric=metric,
        stats=stats,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(stats.total_count / page_size) if stats.total_count > 0 else 0,
        orders=orders,
    )


# ── ON-TIME CHARTS ───────────────────────────────────────────────────────────

CHART_CONFIGS = {
    "pickup": {
        "delta_col": "pickup_delta_minutes",
        "label": "Placement to Pickup",
        "exclude_scheduled": True,
        "buckets": [
            ("0-10 min", 0, 10), ("10-20 min", 10, 20), ("20-30 min", 20, 30),
            ("30-40 min", 30, 40), ("40-50 min", 40, 50), ("50-60 min", 50, 60),
            ("60+ min", 60, None),
        ],
    },
    "delivery": {
        "delta_col": "delivery_delta_minutes",
        "label": "Placement to Delivery",
        "exclude_scheduled": True,
        "buckets": [
            ("0-10 min", 0, 10), ("10-20 min", 10, 20), ("20-30 min", 20, 30),
            ("30-40 min", 30, 40), ("40-50 min", 40, 50), ("50-60 min", 50, 60),
            ("60+ min", 60, None),
        ],
    },
    "drive": {
        "delta_col": "drive_time_minutes",
        "label": "Drive Time",
        "exclude_scheduled": False,
        "buckets": [
            ("0-10 min", 0, 10), ("10-20 min", 10, 20), ("20-30 min", 20, 30),
            ("30-40 min", 30, 40), ("40-50 min", 40, 50), ("50-60 min", 50, 60),
            ("60+ min", 60, None),
        ],
    },
    "ontime": {
        "delta_col": "lateness_minutes",
        "label": "On-time Deliveries",
        "exclude_scheduled": False,
        "buckets": [
            ("ontime", None, 0), ("1-5 min", 1, 5), ("5-10 min", 5, 10),
            ("10-15 min", 10, 15), ("15-30 min", 15, 30), ("30-45 min", 30, 45),
            ("45+ min", 45, None),
        ],
    },
}


def _build_bucket_case(delta_col: str, buckets: list, is_ontime: bool = False) -> str:
    """Build a multiIf expression for bucket assignment."""
    conditions = []
    for label, low, high in buckets:
        if is_ontime and label == "ontime":
            conditions.append(f"{delta_col} <= 0, '{label}'")
        elif high is None:
            conditions.append(f"{delta_col} >= {low}, '{label}'")
        elif low is not None:
            conditions.append(f"{delta_col} >= {low} AND {delta_col} < {high}, '{label}'")
    conditions.append("'unknown'")
    return f"multiIf({', '.join(conditions)})"


def get_ontime_charts(
    client: Client,
    company_ids: list[int],
    timeframe: str,
    tab: str | None = None,
) -> OntimeChartsResponse:
    start, end = resolve_timeframe(timeframe)

    charts_to_build = {tab: CHART_CONFIGS[tab]} if tab and tab in CHART_CONFIGS else CHART_CONFIGS
    charts = []

    for chart_type, config in charts_to_build.items():
        delta_col = config["delta_col"]
        is_ontime = chart_type == "ontime"
        bucket_expr = _build_bucket_case(delta_col, config["buckets"], is_ontime)

        scheduled_filter = "AND is_scheduled = 0" if config["exclude_scheduled"] else ""
        delivered_filter = "AND order_lifecycle_status = 'delivered'" if not is_ontime else "AND order_lifecycle_status = 'delivered'"
        delta_filter = f"AND {delta_col} > 0" if not is_ontime else ""

        query = f"""
            SELECT
                {bucket_expr} AS bucket,
                count() AS cnt
            FROM {TABLE}
            WHERE company_id IN %(company_ids)s
              AND toDate(placement_time) >= %(start)s
              AND toDate(placement_time) <= %(end)s
              {delivered_filter}
              {scheduled_filter}
              {delta_filter}
            GROUP BY bucket
            ORDER BY bucket
        """

        params = {"company_ids": company_ids, "start": start, "end": end}

        log.info(f"chart | type={chart_type} companies={company_ids} timeframe={timeframe}")
        result = client.query(query, parameters=params)

        bucket_counts = {r[0]: r[1] for r in result.result_rows}
        total = sum(bucket_counts.values())

        bucket_entries = []
        cumulative = 0.0
        for label, _, _ in config["buckets"]:
            count = bucket_counts.get(label, 0)
            pct = round(count * 100.0 / total, 2) if total > 0 else 0.0
            cumulative += pct
            bucket_entries.append(BucketEntry(
                bucket=label,
                count=count,
                percentage=pct,
                cumulative_percentage=round(cumulative, 2),
            ))

        charts.append(ChartData(
            chart_type=chart_type,
            total_orders=total,
            buckets=bucket_entries,
        ))

    return OntimeChartsResponse(charts=charts)
