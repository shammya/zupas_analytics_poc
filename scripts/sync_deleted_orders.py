"""
sync_deleted_orders.py

Two-phase script:
  Phase 1: Fetch deleted order info per company from MySQL → deleted_orders.csv
  Phase 2: Read CSV, fetch matching rows from ClickHouse, re-insert enriched rows

Usage:
    python sync_deleted_orders.py --fetch      # Phase 1 only: MySQL → CSV
    python sync_deleted_orders.py --sync       # Phase 2 only: CSV → ClickHouse
    python sync_deleted_orders.py              # Run both phases sequentially
    python sync_deleted_orders.py --dry-run    # Validate without writing
"""

import csv
import sys
import time
import logging
from datetime import datetime
from pathlib import Path

import mysql.connector
import clickhouse_connect

# ── CONFIG ────────────────────────────────────────────────────────────────────

DB_CONFIG = {
    "host": "tier2-replica-db.cv3un2yazhm6.us-west-2.rds.amazonaws.com",
    "port": 3306,
    "user": "MoinAdem2013",  # TODO: MySQL user
    "password": "TagYou2019Qt",  # TODO: MySQL password
    "database": "questtag",
    "connect_timeout": 60,
}

CLICKHOUSE_HOST     = "bxlrs13252.us-west-2.aws.clickhouse.cloud"
CLICKHOUSE_PORT     = 8443
CLICKHOUSE_USER     = "default"
CLICKHOUSE_PASSWORD = "NtCKqb_i8rnf5"
CLICKHOUSE_DATABASE = "shipday_analytics"
CLICKHOUSE_TABLE    = "orders_flat"

CSV_PATH      = Path(__file__).parent / "deleted_orders.csv"
PROGRESS_FILE = Path(__file__).parent / "deleted_fetch_progress.log"

MYSQL_DELAY_SECONDS = 5     # pause between each company fetch
CH_BATCH_SIZE       = 500   # order_ids per ClickHouse round-trip

# Company IDs — shared from fetch_to_csv.py
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

CSV_COLUMNS = ["order_id", "company_id", "deleted_by", "deleted_at"]

# ── LOGGING ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("sync_deleted")

# ── HELPERS ──────────────────────────────────────────────────────────────────


def load_completed() -> set:
    if not PROGRESS_FILE.exists():
        return set()
    return {
        int(line.strip())
        for line in PROGRESS_FILE.read_text().splitlines()
        if line.strip().isdigit()
    }


def mark_completed(company_id: int):
    with PROGRESS_FILE.open("a") as f:
        f.write(f"{company_id}\n")


def parse_datetime(val) -> datetime | None:
    if not val or str(val).strip() == "":
        return None
    try:
        return datetime.strptime(str(val).strip(), "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def chunks(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


# ── PHASE 1: MySQL → CSV ─────────────────────────────────────────────────────

MYSQL_QUERY = """
    SELECT
        d.order_id,
        d.company_id,
        d.deleted_by,
        d.delete_time AS deleted_at
    FROM deleted_order_info d
    WHERE d.company_id = %s
    ORDER BY d.delete_time ASC
"""


def fetch_phase(dry_run: bool, resume: bool):
    log.info("=== PHASE 1: Fetching deleted orders from MySQL ===")

    completed = load_completed() if resume else set()
    if resume and completed:
        log.info(f"Resume mode: skipping {len(completed)} already-completed companies")

    pending = [cid for cid in COMPANY_IDS if cid not in completed]
    log.info(f"Companies to process: {len(pending)}")

    if not pending:
        log.info("Nothing to fetch.")
        return

    # Write CSV header if file doesn't exist
    if not dry_run and not CSV_PATH.exists():
        with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=CSV_COLUMNS).writeheader()
        log.info(f"Created {CSV_PATH.name}")

    try:
        conn   = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        log.info(f"Connected to MySQL: {DB_CONFIG['host']}")
    except mysql.connector.Error as e:
        log.error(f"MySQL connection failed: {e}")
        sys.exit(1)

    total_rows = 0
    failed     = 0

    try:
        for idx, company_id in enumerate(pending, start=1):
            log.info(f"[{idx}/{len(pending)}] Fetching deleted orders for company_id={company_id}")
            try:
                cursor.execute(MYSQL_QUERY, (company_id,))
                rows = cursor.fetchall()
                log.info(f"  → {len(rows)} deleted orders found")

                if not dry_run and rows:
                    with CSV_PATH.open("a", newline="", encoding="utf-8") as f:
                        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS, extrasaction="ignore")
                        for row in rows:
                            writer.writerow({
                                "order_id":   row["order_id"],
                                "company_id": row["company_id"],
                                "deleted_by": row["deleted_by"] or "",
                                "deleted_at": str(row["deleted_at"]) if row["deleted_at"] else "",
                            })
                    mark_completed(company_id)

                total_rows += len(rows)

            except Exception as e:
                log.error(f"  FAILED company_id={company_id}: {e}")
                failed += 1

            if idx < len(pending):
                log.info(f"  Waiting {MYSQL_DELAY_SECONDS}s ...")
                time.sleep(MYSQL_DELAY_SECONDS)

    finally:
        cursor.close()
        conn.close()

    log.info("=" * 50)
    log.info(f"Phase 1 complete. Total deleted rows fetched: {total_rows}, Failed companies: {failed}")


# ── PHASE 2: CSV → ClickHouse re-insert ──────────────────────────────────────

# All columns in orders_flat that we need to re-insert
# (matches CLICKHOUSE_COLUMNS in migrate_orders.py exactly)
CH_COLUMNS = [
    "order_id", "order_number", "company_id", "area_id",
    "customer_id", "restaurant_id", "driver_id", "driver_vehicle_id",
    "order_source", "gateway", "platform", "provider",
    "order_status",
    "is_scheduled", "is_catering", "incomplete", "force_completed",
    "accepted", "third_party_assigned", "third_party_assigned_anytime",
    "out_of_zone", "invalid_address",
    "tracking_link_sent", "tracking_link_opened",
    "approaching_drop_off_notified", "delayed_notification_sent",
    "placement_time", "insert_time",
    "assigned_time", "start_time", "pickedup_time", "arrived_time",
    "delivery_time", "failed_delivery_time", "arrived_dropoff_time",
    "promised_delivery_time",
    "arrived_pickup_time", "pickup_ready_time", "left_pickup",
    "total_cost", "delivery_fee", "predefined_tip", "cash_tip",
    "driver_payment", "service_fee",
    "distance_between_pickup_delivery", "driving_time_between_pickup_delivery",
    "customer_name", "customer_address", "customer_formatted_address",
    "customer_phone_number", "customer_email_address", "customer_identification_id",
    "restaurant_name", "restaurant_address", "restaurant_formatted_address",
    "restaurant_phone_number",
    "driver_name", "driver_phone_number", "driver_status",
    "review_id", "review_order_type", "review_food_rating", "review_driver_rating",
    "review_time", "review_text",
    "review_overall_sentiment", "review_food_sentiment",
    "review_delivery_process_sentiment",
    "review_created_at", "review_updated_at",
    "review_unique_customer_id", "review_escalated", "review_resolved",
    "review_resolver_name", "review_resolve_time",
    "review_dispatcher_note_generated", "review_driver_note_generated",
    "deleted_at", "deleted_by", "deleted_by_role",
    "synced_at",
]

# Index positions for columns we need to mutate
IDX = {col: i for i, col in enumerate(CH_COLUMNS)}


def sync_phase(dry_run: bool):
    log.info("=== PHASE 2: Syncing deleted order data into ClickHouse ===")

    if not CSV_PATH.exists():
        log.error(f"{CSV_PATH} not found. Run --fetch first.")
        sys.exit(1)

    # ── Read CSV → dict { order_id: (deleted_by, deleted_at) } ──
    deleted_map: dict[int, tuple] = {}
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                oid = int(row["order_id"])
                deleted_map[oid] = (
                    row.get("deleted_by", "").strip(),
                    parse_datetime(row.get("deleted_at")),
                )
            except (ValueError, KeyError):
                continue

    total_order_ids = len(deleted_map)
    log.info(f"Loaded {total_order_ids} deleted order IDs from CSV")

    if not deleted_map:
        log.info("Nothing to sync.")
        return

    if dry_run:
        log.info(f"DRY RUN — would process {total_order_ids} orders. Exiting.")
        return

    # ── Connect to ClickHouse ──
    client = clickhouse_connect.get_client(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        username=CLICKHOUSE_USER,
        password=CLICKHOUSE_PASSWORD,
        secure=True,
    )
    log.info(f"Connected to ClickHouse: {CLICKHOUSE_HOST}")

    order_id_batches = list(chunks(list(deleted_map.keys()), CH_BATCH_SIZE))
    total_updated  = 0
    total_missing  = 0
    total_batches  = len(order_id_batches)
    now            = datetime.utcnow()

    for batch_num, batch_ids in enumerate(order_id_batches, start=1):
        log.info(f"Batch {batch_num}/{total_batches}: fetching {len(batch_ids)} rows from ClickHouse")

        # ── Fetch existing rows from ClickHouse ──
        fetch_query = f"""
            SELECT {', '.join(CH_COLUMNS)}
            FROM {CLICKHOUSE_DATABASE}.{CLICKHOUSE_TABLE}
            WHERE order_id IN ({', '.join(str(i) for i in batch_ids)})
        """

        try:
            result = client.query(fetch_query)
        except Exception as e:
            log.error(f"  Batch {batch_num} CH fetch failed: {e}")
            continue

        existing_rows = result.result_rows
        found_ids     = {row[IDX["order_id"]] for row in existing_rows}
        missing_ids   = set(batch_ids) - found_ids

        if missing_ids:
            log.warning(f"  {len(missing_ids)} order_ids not found in ClickHouse: {list(missing_ids)[:5]}{'...' if len(missing_ids) > 5 else ''}")
            total_missing += len(missing_ids)

        if not existing_rows:
            continue

        # ── Enrich rows with deleted info + new synced_at ──
        enriched = []
        for row in existing_rows:
            row = list(row)
            oid = row[IDX["order_id"]]

            deleted_by, deleted_at = deleted_map.get(oid, ("", None))

            row[IDX["deleted_by"]]    = deleted_by
            row[IDX["deleted_at"]]    = deleted_at
            row[IDX["deleted_by_role"]] = "Dispatcher"   # default — update if you have role data
            row[IDX["order_status"]]  = "DELETED"        # triggers MATERIALIZED order_lifecycle_status
            row[IDX["synced_at"]]     = now              # newer → ReplacingMergeTree keeps this version

            enriched.append(tuple(row))

        # ── Re-insert into ClickHouse ──
        try:
            client.insert(
                f"{CLICKHOUSE_DATABASE}.{CLICKHOUSE_TABLE}",
                enriched,
                column_names=CH_COLUMNS,
            )
            log.info(f"  Batch {batch_num}: re-inserted {len(enriched)} enriched rows")
            total_updated += len(enriched)
        except Exception as e:
            log.error(f"  Batch {batch_num} insert failed: {e}")

    client.close()

    log.info("=" * 50)
    log.info("Phase 2 complete.")
    log.info(f"  Total re-inserted : {total_updated}")
    log.info(f"  Not found in CH   : {total_missing}")
    log.info("Run: OPTIMIZE TABLE shipday_analytics.orders_flat FINAL")
    log.info("to force immediate deduplication in ClickHouse.")


# ── MAIN ──────────────────────────────────────────────────────────────────────


def main():
    args    = sys.argv[1:]
    dry_run = "--dry-run" in args
    resume  = "--resume"  in args
    do_fetch = "--fetch" in args or not any(a in args for a in ["--fetch", "--sync"])
    do_sync  = "--sync"  in args or not any(a in args for a in ["--fetch", "--sync"])

    if dry_run:
        log.info("=== DRY RUN MODE ===")

    if do_fetch:
        fetch_phase(dry_run=dry_run, resume=resume)

    if do_sync:
        sync_phase(dry_run=dry_run)


if __name__ == "__main__":
    main()
