-- Create database tables for storing monitoring data
CREATE TABLE IF NOT EXISTS server_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cpu_usage REAL,
    memory_percentage REAL,
    memory_used REAL,
    memory_total REAL,
    disk_percentage REAL,
    disk_used TEXT,
    disk_total TEXT,
    network_download INTEGER,
    network_upload INTEGER,
    load_1min REAL,
    load_5min REAL,
    load_15min REAL,
    active_connections INTEGER,
    process_count INTEGER,
    temperature REAL,
    status TEXT,
    network_status TEXT DEFAULT 'online',
    synced BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS network_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT, -- 'network_down', 'network_up', 'pc_restart', 'service_restart'
    description TEXT,
    duration_seconds INTEGER,
    synced BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS service_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    service_name TEXT,
    status TEXT,
    active BOOLEAN,
    synced BOOLEAN DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_server_metrics_timestamp ON server_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_network_events_timestamp ON network_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_service_status_timestamp ON service_status(timestamp);
