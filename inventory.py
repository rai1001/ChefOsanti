import pandas as pd
import json
import os

file_path = r"c:\Users\trabajo\Documents\antigrabity\chefos\2025-PREVISION PLANING M&E (2).xlsx"

def inventory():
    xls = pd.ExcelFile(file_path)
    sheets = xls.sheet_names
    print(f"Total sheets: {len(sheets)}")
    
    inventory_data = {}
    
    for sheet in sheets:
        df = pd.read_excel(xls, sheet_name=sheet)
        rows, cols = df.shape
        inventory_data[sheet] = {
            "rows": rows,
            "cols": cols,
            "columns": list(df.columns),
            "head": df.head(5).to_dict(orient="records")
        }
        print(f"Sheet: {sheet} | Rows: {rows} | Cols: {cols}")

    with open("inventory_report.json", "w", encoding="utf-8") as f:
        json.dump(inventory_data, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    inventory()
