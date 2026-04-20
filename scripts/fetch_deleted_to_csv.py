"""
fetch_deleted_to_csv.py

Fetches deleted order data from deleted_order_info per company and writes to
deleted_order_flat.csv. Output format matches order_flat.csv plus two extra
columns: deleted_by, deleted_at.

Run migrate_deleted_orders.py after this to insert into ClickHouse.

Usage:
    python fetch_deleted_to_csv.py              # run all companies
    python fetch_deleted_to_csv.py --dry-run    # count rows only, no CSV write
    python fetch_deleted_to_csv.py --resume     # skip companies already done
"""

import csv
import sys
import time
import logging
from pathlib import Path

import mysql.connector

# ── CONFIG ────────────────────────────────────────────────────────────────────

DB_CONFIG = {
    "host": "tier2-replica-db.cv3un2yazhm6.us-west-2.rds.amazonaws.com",
    "port": 3306,
    "user": "MoinAdem2013",  # TODO: MySQL user
    "password": "TagYou2019Qt",  # TODO: MySQL password
    "database": "questtag",
    "connect_timeout": 60,
}

CSV_PATH      = Path(__file__).parent / "deleted_order_flat.csv"
PROGRESS_FILE = Path(__file__).parent / "deleted_fetch_flat_progress.log"

DELAY_SECONDS = 5   # deleted_order_info is much smaller than order_info

COMPANY_IDS = [
    131592, 138871, 138872, 141044, 141285, 141287, 141288, 141291,
    141292, 141453, 141452, 146629, 146632, 146634, 146637, 146640,
    146643, 146645, 146648, 146651, 146654, 146656, 146657, 146659,
    146662, 146663, 146666, 146667, 146670, 146673, 146674, 146676,
    146678, 146680, 146681, 146683, 146684, 146687, 146690, 146692,
    146691, 146689, 146638, 146646, 146649, 146655, 146682, 146686,
    146688, 146685, 146679, 146671, 146677, 146675, 146695, 146672,
    146669, 146668, 146665, 146660, 146664, 146661, 146658, 146653,
    146652, 146650, 146644, 146641, 146647, 146642, 146636, 146628,
    146639, 146633, 146635, 146630, 146620, 146622, 146626, 146627,
    146631, 146625, 146624, 146623, 146621, 146619, 146617,
]

# Matches order_flat.csv exactly, plus deleted_by + deleted_at at the end.
# migrate_deleted_orders.py reads both; migrate_orders.py ignores the extras.
CSV_COLUMNS = [
    "order_id", "order_number", "company_id", "area_id",
    "order_source", "gateway", "platform", "provider", "order_status",
    "is_scheduled", "is_catering", "incomplete", "force_completed", "accepted",
    "third_party_assigned", "third_party_assigned_anytime", "out_of_zone", "invalid_address",
    "placement_time", "assigned_time", "start_time", "pickedup_time", "arrived_time",
    "delivery_time", "failed_delivery_time", "arrived_dropoff_time", "insert_time",
    "arrived_pickup_time", "pickup_ready_time", "left_pickup", "promised_delivery_time",
    "total_cost", "delivery_fee", "predefined_tip", "cash_tip",
    "driver_payment", "service_fee",
    "distance_between_pickup_delivery", "driving_time_between_pickup_delivery",
    "tracking_link_sent", "tracking_link_opened", "approaching_drop_off_notified",
    "delayed_notification_sent",
    "customer_id", "customer_name", "customer_address", "customer_formatted_address",
    "customer_phone_number", "customer_email_address", "customer_identification_id",
    "restaurant_id", "restaurant_name", "restaurant_address", "restaurant_formatted_address",
    "restaurant_phone_number",
    "driver_id", "driver_name", "driver_phone_number", "driver_vehicle_id", "driver_status",
    "review_id", "review_order_type", "review_food_rating", "review_driver_rating",
    "review_time", "review_text",
    "review_overall_sentiment", "review_food_sentiment", "review_delivery_process_sentiment",
    "review_created_at", "review_updated_at", "review_unique_customer_id",
    "review_escalated", "review_resolved", "review_resolver_name", "review_resolve_time",
    "review_dispatcher_note_generated", "review_driver_note_generated",
    # Extra columns not in order_flat.csv — consumed by migrate_deleted_orders.py
    "deleted_by", "deleted_at",
]

# ── SQL ───────────────────────────────────────────────────────────────────────

QUERY = """
SELECT
    -- ══ ORDER CORE ══════════════════════════════════════════════════════════
    oi.order_id,
    oi.order_number,
    oi.company_id,
    0                                                               AS area_id,
    oi.order_source,
    COALESCE(oi.gateway, '')                                        AS gateway,
    COALESCE(oi.platform, '')                                       AS platform,
    COALESCE(oi.provider, '')                                       AS provider,
    'DELETED'                                                       AS order_status,
    COALESCE(oi.is_scheduled, 0)                                    AS is_scheduled,
    COALESCE(oi.is_catering, 0)                                     AS is_catering,
    COALESCE(oi.incomplete, 0)                                      AS incomplete,
    0                                                               AS force_completed,
    COALESCE(oi.accepted, 0)                                        AS accepted,
    COALESCE(oi.third_party_assigned, 0)                            AS third_party_assigned,
    COALESCE(oi.third_party_assigned_anytime, 0)                    AS third_party_assigned_anytime,
    0                                                               AS out_of_zone,
    0                                                               AS invalid_address,

    -- ══ TIMESTAMPS ══════════════════════════════════════════════════════════
    oi.placement_time,
    oi.assigned_time,
    oi.start_time,
    oi.pickedup_time,
    oi.arrived_time,
    oi.delivery_time,
    oi.failed_delivery_time,
    oi.arrived_dropoff_time,
    oi.insert_time,
    oi.arrived_pickup_time,
    oi.pickup_ready_time,
    oi.left_pickup,
    oi.expected_delivery_time                                       AS promised_delivery_time,

    -- ══ FINANCIALS ══════════════════════════════════════════════════════════
    COALESCE(oi.total_cost, 0)                                      AS total_cost,
    COALESCE(oi.delivery_fee, 0)                                    AS delivery_fee,
    COALESCE(oi.predefined_tip, 0)                                  AS predefined_tip,
    COALESCE(oi.cash_tip, 0)                                        AS cash_tip,
    COALESCE(oi.driver_payment, 0)                                  AS driver_payment,
    0                                                               AS service_fee,

    -- ══ GEO ═════════════════════════════════════════════════════════════════
    COALESCE(oi.distance_between_pickup_delivery, 0)                AS distance_between_pickup_delivery,
    COALESCE(oi.driving_time_between_pickup_delivery, 0)            AS driving_time_between_pickup_delivery,

    -- ══ NOTIFICATION FLAGS (not in deleted_order_info) ══════════════════════
    0                                                               AS tracking_link_sent,
    0                                                               AS tracking_link_opened,
    0                                                               AS approaching_drop_off_notified,
    0                                                               AS delayed_notification_sent,

    -- ══ CUSTOMER (inline — no customer table join for deleted orders) ════════
    0                                                               AS customer_id,
    COALESCE(oi.customer_name, '')                                  AS customer_name,
    COALESCE(oi.customer_address, '')                               AS customer_address,
    COALESCE(oi.customer_address, '')                               AS customer_formatted_address,
    COALESCE(oi.customer_phone_number, '')                          AS customer_phone_number,
    COALESCE(oi.customer_email_address, '')                         AS customer_email_address,
    0                                                               AS customer_identification_id,

    -- ══ RESTAURANT ══════════════════════════════════════════════════════════
    COALESCE(r.id, 0)                                               AS restaurant_id,
    COALESCE(r.name, '')                                            AS restaurant_name,
    COALESCE(r.address, '')                                         AS restaurant_address,
    COALESCE(r.formatted_address, '')                               AS restaurant_formatted_address,
    COALESCE(r.phone_number, '')                                    AS restaurant_phone_number,

    -- ══ DRIVER ══════════════════════════════════════════════════════════════
    COALESCE(ca.carrier_id, 0)                                      AS driver_id,
    COALESCE(ca.name, '')                                           AS driver_name,
    COALESCE(ca.phone_number, '')                                   AS driver_phone_number,
    COALESCE(ca.vehicle_id, 0)                                      AS driver_vehicle_id,
    COALESCE(ca.status, 0)                                          AS driver_status,

    -- ══ REVIEW ══════════════════════════════════════════════════════════════
    COALESCE(ra.id, 0)                                              AS review_id,
    COALESCE(ra.order_type, '')                                     AS review_order_type,
    COALESCE(ra.food_rating, 0)                                     AS review_food_rating,
    COALESCE(ra.driver_rating, 0)                                   AS review_driver_rating,
    COALESCE(ra.review_time, 0)                                     AS review_time,
    COALESCE(ra.review_text, '')                                    AS review_text,
    COALESCE(ra.overall_sentiment, '')                              AS review_overall_sentiment,
    COALESCE(ra.food_sentiment, '')                                 AS review_food_sentiment,
    COALESCE(ra.delivery_process_sentiment, '')                     AS review_delivery_process_sentiment,
    ra.created_at                                                   AS review_created_at,
    ra.updated_at                                                   AS review_updated_at,
    COALESCE(ra.unique_customer_id, 0)                              AS review_unique_customer_id,
    COALESCE(ra.escalated, 0)                                       AS review_escalated,
    COALESCE(ra.resolved, 0)                                        AS review_resolved,
    COALESCE(ra.resolver_name, '')                                  AS review_resolver_name,
    COALESCE(ra.resolve_time, 0)                                    AS review_resolve_time,
    COALESCE(ra.dispatcher_note_generated, 0)                       AS review_dispatcher_note_generated,
    COALESCE(ra.driver_note_generated, 0)                           AS review_driver_note_generated,

    -- ══ DELETION INFO ═══════════════════════════════════════════════════════
    COALESCE(oi.deleted_by, '')                                     AS deleted_by,
    oi.delete_time                                                  AS deleted_at

FROM deleted_order_info oi

LEFT JOIN resturant r
    ON oi.resturant_id = r.id

LEFT JOIN carrier ca
    ON oi.assigned_carrier_id = ca.carrier_id

LEFT JOIN review_analysis ra
    ON oi.order_id = ra.order_id

WHERE oi.company_id = %s

ORDER BY oi.placement_time ASC
"""

# ── LOGGING ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("fetch_deleted")

# ── PROGRESS ──────────────────────────────────────────────────────────────────


def load_completed() -> set:
    if not PROGRESS_FILE.exists():
        return set()
    return {
        int(line.strip())
        for line in PROGRESS_FILE.read_text().splitlines()
        if line.strip().isdigit()
    }


def mark_completed(company_id: int) -> None:
    with PROGRESS_FILE.open("a") as f:
        f.write(f"{company_id}\n")


def format_value(val) -> str:
    if val is None:
        return ""
    return str(val)


# ── MAIN ──────────────────────────────────────────────────────────────────────


def main():
    dry_run = "--dry-run" in sys.argv
    resume  = "--resume"  in sys.argv

    if dry_run:
        log.info("=== DRY RUN MODE — no rows will be written ===")

    completed = load_completed() if resume else set()
    if resume and completed:
        log.info(f"Resume mode: skipping {len(completed)} already-completed companies")

    pending = [cid for cid in COMPANY_IDS if cid not in completed]
    total   = len(pending)
    log.info(f"Companies to process: {total} (of {len(COMPANY_IDS)} total)")

    if total == 0:
        log.info("Nothing to do.")
        return

    if not dry_run and not CSV_PATH.exists():
        with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=CSV_COLUMNS).writeheader()
        log.info(f"Created {CSV_PATH.name}")

    log.info(f"Connecting to MySQL: {DB_CONFIG['host']}:{DB_CONFIG['port']} ...")
    try:
        conn   = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        log.info("Connected.")
    except mysql.connector.Error as e:
        log.error(f"DB connection failed: {e}")
        sys.exit(1)

    summary = {"success": 0, "failed": 0, "total_rows": 0}

    try:
        for idx, company_id in enumerate(pending, start=1):
            log.info(f"[{idx}/{total}] Fetching deleted orders for company_id={company_id} ...")
            try:
                cursor.execute(QUERY, (company_id,))
                rows = cursor.fetchall()
                log.info(f"  → {len(rows)} deleted orders found")

                if not dry_run and rows:
                    with CSV_PATH.open("a", newline="", encoding="utf-8") as f:
                        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, extrasaction="ignore")
                        for row in rows:
                            writer.writerow({col: format_value(row.get(col)) for col in CSV_COLUMNS})
                    mark_completed(company_id)
                elif not dry_run:
                    mark_completed(company_id)

                summary["success"]    += 1
                summary["total_rows"] += len(rows)

            except Exception as e:
                log.error(f"  FAILED company_id={company_id}: {e}")
                summary["failed"] += 1

            if idx < total:
                log.info(f"  Waiting {DELAY_SECONDS}s ...")
                time.sleep(DELAY_SECONDS)

    finally:
        cursor.close()
        conn.close()

    log.info("=" * 50)
    log.info("Fetch complete.")
    log.info(f"  Companies processed : {summary['success'] + summary['failed']}/{total}")
    log.info(f"  Successful          : {summary['success']}")
    log.info(f"  Failed              : {summary['failed']}")
    log.info(f"  Total rows fetched  : {summary['total_rows']}")
    if dry_run:
        log.info("  (dry run — no rows written to CSV)")
    else:
        log.info(f"  Output              : {CSV_PATH}")


if __name__ == "__main__":
    main()
