"""
dedup_csv.py
Reads order_flat.csv, keeps the first occurrence of each order_id, overwrites the file.

Usage:
    python dedup_csv.py
"""

import pandas as pd
from pathlib import Path

CSV_PATH = Path(__file__).parent / "order_flat.csv"

df = pd.read_csv(CSV_PATH, dtype=str, keep_default_na=False)
before = len(df)

df.drop_duplicates(subset=["order_id"], keep="first", inplace=True)
after = len(df)

df.to_csv(CSV_PATH, index=False)

print(f"Done. {before} rows → {after} rows ({before - after} duplicates removed)")
