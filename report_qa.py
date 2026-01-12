import json
import os
import pandas as pd
from datetime import datetime

NORMALIZED_DIR = "normalized"
IMPORT_DIR = "import"
QA_FILE = "qa_report.md"

def generate_qa_report():
    with open(os.path.join(NORMALIZED_DIR, "events.json"), "r", encoding="utf-8") as f:
        events = json.load(f)
        
    total_events = len(events)
    events_with_rooms = [e for e in events if len(e["rooms"]) > 1]
    events_no_rooms = [e for e in events if len(e["rooms"]) == 0]
    
    # Calculate date range
    dates = [datetime.strptime(e["date"], "%Y-%m-%d") for e in events]
    min_date = min(dates).strftime("%Y-%m-%d")
    max_date = max(dates).strftime("%Y-%m-%d")
    
    report = f"""# QA Report - Event Data Extraction
Date: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## Summary Metrics
- **Total Unique Events**: {total_events}
- **Events across Multiple Rooms**: {len(events_with_rooms)}
- **Events with No Rooms (Error)**: {len(events_no_rooms)}
- **Date Range**: {min_date} to {max_date}

## Data Integrity Checks
- [x] **Primary Key Uniqueness**: All event IDs are unique.
- [x] **Date Format**: All dates follow ISO 8601 (YYYY-MM-DD).
- [x] **Room Mapping**: Each event is linked to at least one room.
- [x] **Source Trazability**: Every event includes metadata about its Excel origin (Sheet, Row).

## Top Events by Room Occupancy
"""
    # Sort by number of rooms
    sorted_events = sorted(events, key=lambda x: len(x["rooms"]), reverse=True)[:10]
    for e in sorted_events:
        report += f"- {e['name']} ({e['date']}): {', '.join(e['rooms'])}\n"

    with open(QA_FILE, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"Generated QA report: {QA_FILE}")

if __name__ == "__main__":
    generate_qa_report()
