"""
Migrate order data from CSV to ClickHouse Cloud.
Reads order_flat.csv (denormalized MySQL export) and inserts into shipday_analytics.orders_flat.
Derived columns (deltas, lifecycle status) are MATERIALIZED in ClickHouse — not inserted here.

Usage:
    python migrate_orders.py                # run migration
    python migrate_orders.py --dry-run      # validate only, no insert
"""

import sys
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
import pandas as pd
import clickhouse_connect

# ── CONFIG ────────────────────────────────────────────────────────────────────

CLICKHOUSE_HOST = "bxlrs13252.us-west-2.aws.clickhouse.cloud"
CLICKHOUSE_PORT = 8443
CLICKHOUSE_USER = "default"
CLICKHOUSE_PASSWORD = "NtCKqb_i8rnf5"
CLICKHOUSE_DATABASE = "shipday_analytics"
CLICKHOUSE_TABLE = "orders_flat"

CSV_PATH = "/Users/shammo/Desktop/Work/Shipday/Scripts/Zupas_miggration/order_flat.csv"
BATCH_SIZE = 50

# ── COLUMN DEFINITIONS ───────────────────────────────────────────────────────
# Must match ClickHouse table column order for INSERT.
# Excludes MATERIALIZED and DEFAULT-only columns.

CLICKHOUSE_COLUMNS = [
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
]

# ── TYPE GROUPS ───────────────────────────────────────────────────────────────
# Aligned with the new non-nullable ClickHouse schema.
# Only DateTime event columns remain Nullable — everything else defaults to 0 or ''.

# Non-nullable DateTime — must always have a value
REQUIRED_DATETIME = {"placement_time", "insert_time"}

# Nullable DateTime — None is valid (event hasn't occurred)
NULLABLE_DATETIME = {
    "assigned_time", "start_time", "pickedup_time", "arrived_time",
    "delivery_time", "failed_delivery_time", "arrived_dropoff_time",
    "promised_delivery_time", "review_created_at", "review_updated_at",
}

# UInt32 — non-nullable, default 0
UINT32 = {
    "order_id", "company_id", "area_id", "customer_id",
    "restaurant_id", "driver_id", "driver_vehicle_id",
}

# UInt8 — non-nullable, default 0
UINT8 = {
    "is_scheduled", "is_catering", "incomplete", "force_completed",
    "accepted", "third_party_assigned", "third_party_assigned_anytime",
    "out_of_zone", "invalid_address", "tracking_link_sent",
    "tracking_link_opened", "approaching_drop_off_notified",
    "delayed_notification_sent", "driver_status",
    "review_food_rating", "review_driver_rating",
    "review_escalated", "review_resolved",
    "review_dispatcher_note_generated", "review_driver_note_generated",
}

# Int64 — non-nullable, default 0
INT64 = {
    "arrived_pickup_time", "pickup_ready_time", "left_pickup",
    "customer_identification_id", "review_id", "review_time",
    "review_unique_customer_id", "review_resolve_time",
}

# Float32 — non-nullable, default 0
FLOAT32 = {
    "driver_payment", "service_fee",
    "distance_between_pickup_delivery", "driving_time_between_pickup_delivery",
}

# Decimal(10,2) — non-nullable, default 0.00
DECIMAL = {"total_cost", "delivery_fee", "predefined_tip", "cash_tip"}

# String — non-nullable, default ''
STRING = {
    "order_number", "order_source", "gateway", "platform", "provider",
    "order_status",
    "customer_name", "customer_address", "customer_formatted_address",
    "customer_phone_number", "customer_email_address",
    "restaurant_name", "restaurant_address", "restaurant_formatted_address",
    "restaurant_phone_number",
    "driver_name", "driver_phone_number",
    "review_order_type", "review_text",
    "review_overall_sentiment", "review_food_sentiment",
    "review_delivery_process_sentiment", "review_resolver_name",
}

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"

# ── LOGGING ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("migrate")

# ── HELPERS ──────────────────────────────────────────────────────────────────


def is_empty(val):
    if val is None:
        return True
    if isinstance(val, float) and pd.isna(val):
        return True
    if isinstance(val, str) and val.strip() == "":
        return True
    return False


def parse_datetime(val):
    if is_empty(val):
        return None
    try:
        return datetime.strptime(str(val).strip(), DATETIME_FORMAT)
    except ValueError:
        return None


def parse_int(val, default=0):
    if is_empty(val):
        return default
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return default


def parse_float(val, default=0.0):
    if is_empty(val):
        return default
    try:
        return float(str(val).strip())
    except (ValueError, TypeError):
        return default


def parse_decimal(val):
    if is_empty(val):
        return Decimal("0.00")
    try:
        return Decimal(str(val).strip()).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError):
        return Decimal("0.00")


def parse_string(val):
    if is_empty(val):
        return ""
    return str(val).strip()


# ── CORE FUNCTIONS ───────────────────────────────────────────────────────────


def validate_row(row, idx):
    errors = []
    if is_empty(row.get("order_id")):
        errors.append(f"Row {idx}: missing order_id")
    if is_empty(row.get("company_id")):
        errors.append(f"Row {idx}: missing company_id")
    if is_empty(row.get("placement_time")):
        errors.append(f"Row {idx}: missing placement_time")
    return errors


def parse_row(row):
    parsed = {}

    for col in CLICKHOUSE_COLUMNS:
        val = row.get(col)

        if col in REQUIRED_DATETIME:
            parsed[col] = parse_datetime(val) or datetime(2000, 1, 1)
        elif col in NULLABLE_DATETIME:
            parsed[col] = parse_datetime(val)
        elif col in UINT32:
            parsed[col] = parse_int(val, default=0)
        elif col in UINT8:
            parsed[col] = parse_int(val, default=0)
        elif col in INT64:
            parsed[col] = parse_int(val, default=0)
        elif col in FLOAT32:
            parsed[col] = parse_float(val, default=0.0)
        elif col in DECIMAL:
            parsed[col] = parse_decimal(val)
        elif col in STRING:
            parsed[col] = parse_string(val)
        else:
            parsed[col] = parse_string(val)

    return tuple(parsed[col] for col in CLICKHOUSE_COLUMNS)


def insert_batch(client, rows, batch_num):
    try:
        client.insert(
            f"{CLICKHOUSE_DATABASE}.{CLICKHOUSE_TABLE}",
            rows,
            column_names=CLICKHOUSE_COLUMNS,
        )
        log.info(f"  Batch {batch_num}: inserted {len(rows)} rows")
        return len(rows)
    except Exception as e:
        log.error(f"  Batch {batch_num} FAILED: {e}")
        return 0


def main():
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        log.info("=== DRY RUN MODE ===")

    log.info(f"Reading CSV: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH, dtype=str, keep_default_na=False)
    total_rows = len(df)
    log.info(f"Found {total_rows} rows, {len(df.columns)} columns")

    valid_rows = []
    skipped = 0
    for idx, row in df.iterrows():
        row_dict = row.to_dict()
        errors = validate_row(row_dict, idx)
        if errors:
            for err in errors:
                log.warning(f"SKIP: {err}")
            skipped += 1
            continue
        valid_rows.append(row_dict)

    log.info(f"Validated: {len(valid_rows)} valid, {skipped} skipped")

    if not valid_rows:
        log.error("No valid rows to insert. Exiting.")
        return

    log.info("Parsing rows...")
    parsed_rows = []
    parse_errors = 0
    for i, row_dict in enumerate(valid_rows):
        try:
            parsed_rows.append(parse_row(row_dict))
        except Exception as e:
            log.warning(f"Parse error row {i} (order_id={row_dict.get('order_id')}): {e}")
            parse_errors += 1

    log.info(f"Parsed: {len(parsed_rows)} ready, {parse_errors} errors")

    if dry_run:
        log.info(f"=== DRY RUN COMPLETE — {len(parsed_rows)} rows would be inserted ===")
        return

    log.info(f"Connecting to ClickHouse: {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}")
    client = clickhouse_connect.get_client(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        username=CLICKHOUSE_USER,
        password=CLICKHOUSE_PASSWORD,
        secure=True,
    )

    pre_count = client.query(f"SELECT count() FROM {CLICKHOUSE_DATABASE}.{CLICKHOUSE_TABLE}").result_rows[0][0]
    log.info(f"Pre-insert count: {pre_count}")

    total_inserted = 0
    for i in range(0, len(parsed_rows), BATCH_SIZE):
        batch = parsed_rows[i : i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_inserted += insert_batch(client, batch, batch_num)

    post_count = client.query(f"SELECT count() FROM {CLICKHOUSE_DATABASE}.{CLICKHOUSE_TABLE}").result_rows[0][0]
    delta = post_count - pre_count

    log.info("=" * 50)
    log.info(f"Migration complete.")
    log.info(f"  CSV rows:       {total_rows}")
    log.info(f"  Validated:      {len(valid_rows)}")
    log.info(f"  Parsed:         {len(parsed_rows)}")
    log.info(f"  Inserted:       {total_inserted}")
    log.info(f"  Skipped:        {skipped}")
    log.info(f"  Parse errors:   {parse_errors}")
    log.info(f"  CH count delta: {delta} (pre={pre_count}, post={post_count})")

    if delta != total_inserted:
        log.warning(f"  COUNT MISMATCH: expected delta={total_inserted}, got {delta}. "
                     "May be due to ReplacingMergeTree dedup on re-run.")
    else:
        log.info("  Count verification PASSED.")

    client.close()


if __name__ == "__main__":
    main()
