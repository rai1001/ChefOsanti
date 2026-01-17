import pandas as pd
import os
import json
import hashlib
from datetime import datetime

RAW_DIR = "raw"
OUTPUT_DIR = "normalized"
MONTH_MAP = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3,
    "ABRIL": 4, "MAYO": 5, "JUNIO": 6,
    "JULIO": 7, "AGOSTO": 8, "SEPTIEMBRE": 9,
    "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12
}

def get_id(name, date_str):
    return hashlib.md5(f"{name}_{date_str}".encode()).hexdigest()

def transform():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    all_events = {} # key: (name, date_str)
    
    for filename in os.listdir(RAW_DIR):
        if not filename.endswith(".csv") or "ALOJAMIENTO" in filename:
            continue
            
        filepath = os.path.join(RAW_DIR, filename)
        df = pd.read_csv(filepath)
        
        # Infer year from sheet name (e.g., "2025-ENERO_MARZO.csv")
        year = int(filename.split("-")[0])
        
        current_month = None
        # The first column name is usually the first month of the quarter
        first_col = df.columns[0]
        if first_col.upper() in MONTH_MAP:
            current_month = MONTH_MAP[first_col.upper()]
            
        room_cols = [c for c in df.columns if c not in [first_col, '_sheet', '_row_number', '_imported_at'] and not c.startswith("Unnamed")]
        
        # Get column indices to use with itertuples
        sheet_col_idx = df.columns.get_loc('_sheet')
        row_num_col_idx = df.columns.get_loc('_row_number')
        room_col_indices = {c: df.columns.get_loc(c) for c in room_cols}

        for row in df.itertuples(index=False):
            val_0 = str(row[0]).strip().upper()
            
            if val_0 in MONTH_MAP:
                current_month = MONTH_MAP[val_0]
                continue
            
            try:
                day = int(float(val_0))
            except ValueError:
                continue # Skip headers or empty rows
                
            if current_month is None:
                continue
                
            date_str = f"{year}-{current_month:02d}-{day:02d}"
            
            for room, room_idx in room_col_indices.items():
                content = str(row[room_idx]).strip()
                if content and content != 'nan' and content != '\u00a0': # Handle &nbsp;
                    # Event name is the content (needs cleaning later)
                    event_name = content
                    event_key = (event_name, date_str)
                    
                    if event_key not in all_events:
                        all_events[event_key] = {
                            "id": get_id(event_name, date_str),
                            "name": event_name,
                            "date": date_str,
                            "rooms": [],
                            "sources": [],
                            "menu": {
                                "status": "pending",
                                "items": []
                            }
                        }
                    
                    if room not in all_events[event_key]["rooms"]:
                        all_events[event_key]["rooms"].append(room)
                    
                    all_events[event_key]["sources"].append({
                        "sheet": row[sheet_col_idx],
                        "row": row[row_num_col_idx],
                        "room": room,
                        "raw_content": content
                    })

    # Convert to list
    final_dataset = list(all_events.values())
    
    with open(os.path.join(OUTPUT_DIR, "events.json"), "w", encoding="utf-8") as f:
        json.dump(final_dataset, f, indent=2, ensure_ascii=False)
        
    # Also save as CSV for accessibility
    flat_data = []
    for ev in final_dataset:
        flat_data.append({
            "id": ev["id"],
            "name": ev["name"],
            "date": ev["date"],
            "rooms": ", ".join(ev["rooms"]),
            "menu_status": ev["menu"]["status"]
        })
    pd.DataFrame(flat_data).to_csv(os.path.join(OUTPUT_DIR, "events.csv"), index=False, encoding="utf-8")
    
    print(f"Transformed {len(final_dataset)} unique events.")

if __name__ == "__main__":
    transform()
