# Data Dictionary - Event Schema

This document describes the structure of the normalized event data extracted from the Excel previsión.

## Entity: `events`
Main table representing a unique event occurring on a specific date.

| Column | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Deterministic unique ID derived from (name, date). | `a1b2c3d4-e5f6-...` |
| `org_id` | UUID | Identifier for the organization/tenant (RLS placeholder). | `00000000-...` |
| `name` | TEXT | Cleaned name of the event or group. | `BICO DE XEADO` |
| `event_date` | DATE | Inferred date from row number and sheet month. | `2025-01-05` |
| `menu_status`| TEXT | Status of the production menu (`pending`, `confirmed`). | `pending` |
| `menu_data` | JSONB | Structured data for menu items (purchasing/production). | `{ "items": [] }` |
| `created_at` | TIMESTAMP| Row creation timestamp. | `2026-01-12...` |
| `updated_at` | TIMESTAMP| Last update timestamp. | `2026-01-12...` |

## Entity: `event_rooms`
Join table mapping events to the physical spaces they occupy.

| Column | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `event_id` | UUID | Reference to `events.id`. | `a1b2c3d4-...` |
| `room_name` | TEXT | Name of the room (e.g., ROSALIA, HALL). | `ROSALIA` |
| `org_id` | UUID | Organization identifier for RLS. | `00000000-...` |

---

## Room Catalog
Extracted from Excel columns:
- ROSALIA
- PONDAL
- CASTELAO
- CURROS
- CUNQUEIRO
- HALL
- RESTAURANTE
- BAR
