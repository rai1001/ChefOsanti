import pandas as pd
import os
from datetime import datetime

FILE_PATH = r"2025-PREVISION PLANING M&E (2).xlsx"
RAW_DIR = "raw"

def extract_raw():
    if not os.path.exists(RAW_DIR):
        os.makedirs(RAW_DIR)
        
    xls = pd.ExcelFile(FILE_PATH)
    imported_at = datetime.now().isoformat()
    
    for sheet_name in xls.sheet_names:
        print(f"Extracting {sheet_name}...")
        # Read without headers first to handle complex headers if any
        df = pd.read_excel(xls, sheet_name=sheet_name)
        
        # Add metadata columns
        df['_sheet'] = sheet_name
        df['_row_number'] = df.index + 2 # +1 for 0-indexing, +1 for header
        df['_imported_at'] = imported_at
        
        # Save to CSV
        csv_filename = sheet_name.replace(" ", "_").replace(".", "_") + ".csv"
        df.to_csv(os.path.join(RAW_DIR, csv_filename), index=False, encoding='utf-8')
        print(f"Saved to {csv_filename}")

if __name__ == "__main__":
    extract_raw()
