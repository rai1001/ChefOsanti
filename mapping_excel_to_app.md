# Mapping: Excel to App Schema

How the raw data from `2025-PREVISION PLANING M&E (2).xlsx` was transformed.

## Source Data Structure
- **Sheets**: Divided by quarters (e.g., `2025-ENERO.MARZO`).
- **Rows**: Represent days (1 to 31). Month headers (e.g., "FEBRERO") repeat within the sheet.
- **Columns**: Represent physical rooms.

## Mapping Logic

| Excel Source | App Field | Transformation Rule |
| :--- | :--- | :--- |
| Sheet Name | `year` | First 4 characters of the filename/sheet. |
| Row Header (val 0) | `month` | Mapped from Spanish month names (ENERO -> 1). |
| First Column | `day` | Parsed from numeric values in column index 0. |
| Column Name | `room_name`| Direct mapping of room columns into `event_rooms`. |
| Cell Content | `name` | Extracted text. Cleaned and used for deterministic UUIDs. |
| Cell Content | `menu_data`| Placeholder `{}` created for each event. |

## Handling Combined Events
If an event name (e.g., "UD ALMERIA") appears in multiple columns (rooms) on the same date, they are grouped into a **single event entry** with multiple entries in the `event_rooms` table.

## Identity (Idempotency)
- **ID Generation**: `MD5(name + date)` mapped to a UUID format.
- Running the script multiple times will update existing events instead of duplicating them.
