
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    event_date DATE NOT NULL,
    menu_status TEXT DEFAULT 'pending',
    menu_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_rooms (
    event_id TEXT REFERENCES events(id),
    room_name TEXT NOT NULL,
    PRIMARY KEY (event_id, room_name)
);
